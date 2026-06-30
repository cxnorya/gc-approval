const db = require('../models');
const DingTalkService = require('../services/dingtalkService');

const APPROVER_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长'];

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

async function checkApproverPermission(userId) {
  const user = await db.User.findById(userId);
  if (!user) return false;
  return APPROVER_ROLES.includes(user.role) || user.role === 'admin';
}

async function getPendingApprovals(req, res) {
  const { approver_id } = req.query;

  try {
    const hasPermission = await checkApproverPermission(parseInt(approver_id));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: '无审批权限' });
    }

    let apps = await db.Application.findAll();

    if (approver_id) {
      apps = apps.filter(a => a.approver_id === parseInt(approver_id));
    }

    apps = apps.filter(a => a.status === 'pending');
    
    const result = await Promise.all(apps.map(async app => {
      const applicant = await db.User.findById(app.applicant_id);
      const location = await db.Location.findById(app.location_id);
      return {
        ...app,
        applicant_name: applicant?.name || '',
        applicant_department: applicant?.department || '',
        location_name: location?.name || '',
        location_amount: location?.amount || 0
      };
    }));
    
    res.json({
      success: true,
      data: result.reverse()
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取待审批列表失败', error: error.message });
  }
}

async function approveApplication(req, res) {
  const { id } = req.params;
  const { comment, approver_id } = req.body;

  try {
    const hasPermission = await checkApproverPermission(parseInt(approver_id));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: '无审批权限' });
    }

    await db.Application.updateStatus(id, 'approved', comment || '');

    // 完成钉钉待办任务
    try {
      const completedApp = await db.Application.findById(id);
      if (completedApp && completedApp.dingtalk_task_id) {
        const approver = await db.User.findById(completedApp.approver_id);
        if (approver && approver.dingtalk_userid) {
          const userDetail = await dingTalkService.getUserDetail(approver.dingtalk_userid);
          if (userDetail && userDetail.unionid) {
            await dingTalkService.updateTodoTask(userDetail.unionid, completedApp.dingtalk_task_id, true);
          }
        }
      }
    } catch (todoError) {
      console.warn('更新钉钉待办状态失败:', todoError.message);
    }

    const app = await db.Application.findById(id);
    if (app) {
      const applicant = await db.User.findById(app.applicant_id);
      const approver = await db.User.findById(app.approver_id);
      
      if (applicant) {
        const title = '您的公出申请已通过审批';
        const content = `审批人：${approver?.name || '未知'}\n公出事由：${app.reason}\n报销金额：¥${app.amount || 0}\n审批意见：${comment || '无'}\n\n点击详情查看`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const targetUrl = `${frontendUrl}/#/approval-detail?id=${app.id}`;
        const messageUrl = generateDingTalkUrl(targetUrl);
        
        sendApprovalNotification(applicant.id, title, content, messageUrl);
      }
    }

    res.json({ success: true, message: '审批通过' });
  } catch (error) {
    res.status(500).json({ success: false, message: '审批失败', error: error.message });
  }
}

async function rejectApplication(req, res) {
  const { id } = req.params;
  const { reason, comment, approver_id } = req.body;

  try {
    const hasPermission = await checkApproverPermission(parseInt(approver_id));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: '无审批权限' });
    }

    await db.Application.updateStatus(id, 'rejected', comment || '', reason);

    // 完成钉钉待办任务
    try {
      const completedApp = await db.Application.findById(id);
      if (completedApp && completedApp.dingtalk_task_id) {
        const approver = await db.User.findById(completedApp.approver_id);
        if (approver && approver.dingtalk_userid) {
          const userDetail = await dingTalkService.getUserDetail(approver.dingtalk_userid);
          if (userDetail && userDetail.unionid) {
            await dingTalkService.updateTodoTask(userDetail.unionid, completedApp.dingtalk_task_id, true);
          }
        }
      }
    } catch (todoError) {
      console.warn('更新钉钉待办状态失败:', todoError.message);
    }

    const app = await db.Application.findById(id);
    if (app) {
      const applicant = await db.User.findById(app.applicant_id);
      const approver = await db.User.findById(app.approver_id);
      
      if (applicant) {
        const title = '您的公出申请已被驳回';
        const content = `审批人：${approver?.name || '未知'}\n公出事由：${app.reason}\n驳回原因：${reason || '无'}\n审批意见：${comment || '无'}\n\n点击详情查看`;
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const targetUrl = `${frontendUrl}/#/approval-detail?id=${app.id}`;
        const messageUrl = generateDingTalkUrl(targetUrl);
        
        sendApprovalNotification(applicant.id, title, content, messageUrl);
      }
    }

    res.json({ success: true, message: '已驳回' });
  } catch (error) {
    res.status(500).json({ success: false, message: '驳回失败', error: error.message });
  }
}



async function getPendingCount(req, res) {
  const { approver_id } = req.query;
  try {
    const hasPermission = await checkApproverPermission(parseInt(approver_id));
    if (!hasPermission) {
      return res.status(403).json({ success: false, message: '无审批权限' });
    }
    let apps = await db.Application.findAll();
    if (approver_id) {
      apps = apps.filter(a => a.approver_id === parseInt(approver_id));
    }
    apps = apps.filter(a => a.status === 'pending');
    res.json({ success: true, count: apps.length });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取待审批数量失败', error: error.message });
  }
}
module.exports = { getPendingApprovals, getPendingCount, approveApplication, rejectApplication };