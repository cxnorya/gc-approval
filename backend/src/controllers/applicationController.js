﻿const db = require('../models');
const DingTalkService = require('../services/dingtalkService');

const dingTalkService = new DingTalkService(
  process.env.DINGTALK_APP_KEY,
  process.env.DINGTALK_APP_SECRET
);

// 生成钉钉跳转URL
function generateDingTalkUrl(targetUrl) {
  const corpId = process.env.DINGTALK_CORP_ID;
  const agentId = process.env.DINGTALK_AGENT_ID;
  const encodedUrl = encodeURIComponent(targetUrl);
  return `dingtalk://dingtalkclient/action/openapp?corpid=${corpId}&container_type=work_platform&app_id=0_${agentId}&redirect_type=jump&redirect_url=${encodedUrl}`;
}

async function sendApprovalNotification(userId, title, content, messageUrl = null) {
  try {
    const user = await db.User.findById(userId);
    if (!user || !user.dingtalk_userid) {
      console.warn(`用户 ${userId} 没有钉钉ID，无法发送通知`);
      return;
    }

    await dingTalkService.sendWorkNotice(user.dingtalk_userid, title, content, messageUrl);
    console.log(`已发送工作通知给 ${user.name}`);
  } catch (error) {
    console.warn(`发送通知失败: ${error.message}`);
  }
}

// 修复旧的附件文件名编码（Latin-1 -> UTF-8）
function fixAttachmentEncoding(attachments) {
  if (!attachments) return attachments;
  try {
    const parsed = typeof attachments === 'string' ? JSON.parse(attachments) : attachments;
    if (!Array.isArray(parsed)) return attachments;
    return parsed.map(att => {
      if (att.originalname) {
        try {
          const fixed = Buffer.from(att.originalname, 'latin1').toString('utf8');
          if (!fixed.includes('\uFFFD')) {
            att.originalname = fixed;
          }
        } catch (e) {}
      }
      return att;
    });
  } catch (e) { return attachments; }
}

async function createApplication(req, res) {
  const { applicant_id, approver_id, apply_date, travel_date, reason, location_id, person_count, attachments } = req.body;
  
  try {
    const location = await db.Location.findById(location_id);
    
    if (!location || location.status !== 1) {
      return res.status(400).json({ success: false, message: '无效的公出地点' });
    }
    
    const result = await db.Application.create({
      applicant_id: parseInt(applicant_id),
      approver_id: parseInt(approver_id),
      apply_date,
      travel_date,
      reason,
      location_id,
      person_count: parseInt(person_count),
      location_amount: location.amount,
      attachments
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建申请失败', error: error.message });
  }
}

async function getApplications(req, res) {
  const { user_id, approver_id, status } = req.query;
  let apps = await db.Application.findAll();
  
  if (user_id) {
    apps = apps.filter(a => a.applicant_id === parseInt(user_id));
  }
  
  if (approver_id) {
    apps = apps.filter(a => a.approver_id === parseInt(approver_id));
  }
  
  if (status) {
    apps = apps.filter(a => a.status === status);
  }
  
  const result = await Promise.all(apps.map(async app => {
    app.attachments = fixAttachmentEncoding(app.attachments);
    app.attachments = fixAttachmentEncoding(app.attachments);
    const applicant = await db.User.findById(app.applicant_id);
    const approver = await db.User.findById(app.approver_id);
    const location = await db.Location.findById(app.location_id);
    return {
      ...app,
      applicant_name: applicant?.name || '',
      applicant_department: applicant?.department || '',
      approver_name: approver?.name || '',
      location_name: location?.name || '',
      location_amount: location?.amount || 0
    };
  }));
  
  res.json({
    success: true,
    data: result
  });
}

async function getApplicationById(req, res) {
  const { id } = req.params;
  
  try {
    const app = await db.Application.findById(id);
    
    if (!app) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    
    app.attachments = fixAttachmentEncoding(app.attachments);
    const applicant = await db.User.findById(app.applicant_id);
    const approver = await db.User.findById(app.approver_id);
    const location = await db.Location.findById(app.location_id);
    
    res.json({
      success: true,
      data: {
        ...app,
        applicant_name: applicant?.name || '',
        applicant_department: applicant?.department || '',
        approver_name: approver?.name || '',
        location_name: location?.name || '',
        location_amount: location?.amount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取申请详情失败', error: error.message });
  }
}

async function updateApplication(req, res) {
  const { id } = req.params;
  const { apply_date, travel_date, approver_id, reason, location_id, person_count } = req.body;
  
  try {
    const app = await db.Application.findById(id);
    if (!app) {
      return res.status(404).json({ success: false, message: '申请不存在' });
    }
    
    const updateData = {};
    if (apply_date) updateData.apply_date = apply_date;
    if (travel_date) updateData.travel_date = travel_date;
    if (approver_id) updateData.approver_id = parseInt(approver_id);
    if (reason) updateData.reason = reason;
    if (location_id) updateData.location_id = location_id;
    
    if (person_count) {
      updateData.person_count = parseInt(person_count);
      const location = await db.Location.findById(location_id || app.location_id);
      if (location) {
        updateData.amount = db.Application.calculateAmount(parseInt(person_count), location.amount);
      }
    }
    
    await db.Application.update(id, updateData);
    
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新申请失败', error: error.message });
  }
}

async function deleteApplication(req, res) {
  const { id } = req.params;
  
  try {
    await db.Application.delete(id);
    
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '删除申请失败', error: error.message });
  }
}

async function submitApplication(req, res) {
  const { id } = req.params;
  
  try {
    await db.Application.updateStatus(id, 'pending');

    const app = await db.Application.findById(id);
    if (app) {
      app.attachments = fixAttachmentEncoding(app.attachments);
      const applicant = await db.User.findById(app.applicant_id);
      const approver = await db.User.findById(app.approver_id);
      const location = await db.Location.findById(app.location_id);
      
      if (approver) {
        const title = '有新的公出审批待处理';
        const content = `申请人：${applicant?.name || '未知'}\n公出事由：${app.reason}\n公出地点：${location?.name || '未知'}\n出行人数：${app.person_count}人\n报销金额：¥${app.amount || 0}\n\n点击详情查看并审批`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const targetUrl = `${frontendUrl}/#/approval-detail?id=${app.id}`;
        const messageUrl = generateDingTalkUrl(targetUrl);
        
        // 发送工作通知
        sendApprovalNotification(approver.id, title, content, messageUrl);
        
        // 创建钉钉待办任务（不阻塞提交）
        // 创建钉钉待办任务（新版接口）
if (approver.dingtalk_userid) {
    (async () => {
        try {
            // 获取审批人的 unionId（新版接口需要）
            const userDetail = await dingTalkService.getUserDetail(approver.dingtalk_userid);
            console.log('审批人详情:', userDetail); // 添加日志
            const unionId = userDetail && userDetail.unionid;
            if (!unionId) {
                console.warn('无法获取审批人 unionId，跳过待办创建');
                console.warn('  审批人 userId:', approver.dingtalk_userid);
                console.warn('  用户详情:', userDetail);
                return;
            }
            const todoResult = await dingTalkService.createTodoTask(
                unionId,                           // 审批人 unionId
                title,                             // 待办标题
                content,                           // 描述
                [unionId],                         // ✅ 正确：传 unionId 数组
                targetUrl                          // 跳转链接
            );
            if (todoResult && todoResult.id) {
                await db.Application.update(id, { dingtalk_task_id: todoResult.id });
            }
        } catch (todoError) {
            console.warn('创建钉钉待办失败:', todoError.message);
        }
    })();
}
      }
    }
    
    res.json({ success: true, message: '提交成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '提交申请失败', error: error.message });
  }
}

async function cancelApplication(req, res) {
  const { id } = req.params;
  
  try {
    await db.Application.updateStatus(id, 'cancelled');
    
    res.json({ success: true, message: '取消成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '取消申请失败', error: error.message });
  }
}

module.exports = { createApplication, getApplications, getApplicationById, updateApplication, deleteApplication, submitApplication, cancelApplication };