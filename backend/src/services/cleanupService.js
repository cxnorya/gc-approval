const fs = require('fs');
const path = require('path');
const db = require('../models');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const CLEANUP_DAYS = 90;

async function cleanupExpiredAttachments() {
  console.log('开始执行附件清理任务...');
  
  try {
    const rows = await db.Application.findAll();
    
    if (!rows || rows.length === 0) {
      console.log('没有申请记录，跳过清理');
      return;
    }
    
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() - CLEANUP_DAYS);
    const expireDateStr = expireDate.toISOString().slice(0, 19).replace('T', ' ');
    
    console.log(`清理条件：审批完成时间早于 ${expireDateStr}（${CLEANUP_DAYS}天前）`);
    
    let deletedFileCount = 0;
    let updatedRecordCount = 0;
    
    for (const app of rows) {
      if (app.status !== 'approved' && app.status !== 'rejected' && app.status !== 'cancelled') {
        continue;
      }
      
      if (!app.approved_at) {
        continue;
      }
      
      if (app.approved_at > expireDateStr) {
        continue;
      }
      
      if (!app.attachments) {
        continue;
      }
      
      let attachments;
      try {
        attachments = typeof app.attachments === 'string' ? JSON.parse(app.attachments) : app.attachments;
      } catch (error) {
        console.warn(`解析申请 ${app.id} 的附件数据失败: ${error.message}`);
        continue;
      }
      
      if (!Array.isArray(attachments) || attachments.length === 0) {
        continue;
      }
      
      const deletedFilenames = [];
      for (const attachment of attachments) {
        if (attachment.filename) {
          const filePath = path.join(UPLOAD_DIR, attachment.filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
              deletedFilenames.push(attachment.filename);
              deletedFileCount++;
              console.log(`已删除文件: ${attachment.filename}`);
            } catch (error) {
              console.warn(`删除文件失败 ${attachment.filename}: ${error.message}`);
            }
          }
        }
      }
      
      if (deletedFilenames.length > 0) {
        await db.Application.update(app.id, { attachments: JSON.stringify([]) });
        updatedRecordCount++;
        console.log(`已清理申请 ${app.id} 的附件，共删除 ${deletedFilenames.length} 个文件`);
      }
    }
    
    console.log(`附件清理任务完成：共删除 ${deletedFileCount} 个文件，更新 ${updatedRecordCount} 条记录`);
    
  } catch (error) {
    console.error('附件清理任务执行失败:', error.message);
  }
}

function startCleanupSchedule() {
  cleanupExpiredAttachments();
  
  setInterval(() => {
    cleanupExpiredAttachments();
  }, 24 * 60 * 60 * 1000);
  
  console.log(`附件自动清理任务已启动，每天执行一次，清理${CLEANUP_DAYS}天前已审批的附件`);
}

module.exports = { cleanupExpiredAttachments, startCleanupSchedule };
