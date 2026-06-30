require('dotenv').config();
const axios = require('axios');

const DINGTALK_BASE_URL = 'https://oapi.dingtalk.com';

async function test() {
  try {
    const tokenRes = await axios.get(`${DINGTALK_BASE_URL}/gettoken`, {
      params: {
        appkey: process.env.DINGTALK_APP_KEY,
        appsecret: process.env.DINGTALK_APP_SECRET
      },
      timeout: 15000
    });
    
    const accessToken = tokenRes.data.access_token;
    
    // 获取温州育英学校－校长部门的用户
    const userRes = await axios.post(
      `${DINGTALK_BASE_URL}/topapi/v2/user/list`,
      {
        dept_id: 7656745,
        cursor: 0,
        size: 10,
        language: 'zh_CN'
      },
      {
        params: { access_token: accessToken },
        timeout: 15000
      }
    );
    
    const users = userRes.data.result?.list || [];
    console.log(`用户数量: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n第一个用户的完整字段:');
      console.log(JSON.stringify(users[0], null, 2));
    }
    
  } catch (error) {
    console.log('出错了:', error.message);
  }
}

test();
