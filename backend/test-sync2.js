require('dotenv').config();
const DingTalkService = require('./src/services/dingtalkService');

const dingTalkService = new DingTalkService(
  process.env.DINGTALK_APP_KEY,
  process.env.DINGTALK_APP_SECRET
);

async function test() {
  console.log('开始测试同步（带限流）...');
  const start = Date.now();

  try {
    const users = await dingTalkService.getAllUsers();
    console.log(`\n同步成功！共 ${users.length} 个用户`);
    console.log(`总耗时: ${((Date.now() - start) / 1000).toFixed(1)} 秒`);
    console.log('\n前5个用户:');
    users.slice(0, 5).forEach(u => console.log(`  - ${u.name} (${u.userid})`));
  } catch (error) {
    console.log('出错了:', error.message);
    console.log('总耗时:', ((Date.now() - start) / 1000).toFixed(1), '秒');
  }
}

test();
