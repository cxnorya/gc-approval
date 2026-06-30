require('dotenv').config();
const axios = require('axios');

const DINGTALK_BASE_URL = 'https://oapi.dingtalk.com';

async function test() {
  console.log('开始测试钉钉API...');
  
  const start = Date.now();
  
  try {
    console.log('1. 获取access_token...');
    const t1 = Date.now();
    const tokenRes = await axios.get(`${DINGTALK_BASE_URL}/gettoken`, {
      params: {
        appkey: process.env.DINGTALK_APP_KEY,
        appsecret: process.env.DINGTALK_APP_SECRET
      },
      timeout: 15000
    });
    console.log(`   完成，耗时 ${Date.now() - t1}ms`);
    console.log(`   errcode: ${tokenRes.data.errcode}`);
    
    if (tokenRes.data.errcode !== 0) {
      console.log('   错误:', tokenRes.data.errmsg);
      return;
    }
    
    const accessToken = tokenRes.data.access_token;
    
    console.log('\n2. 获取根部门列表...');
    const t2 = Date.now();
    const deptRes = await axios.get(`${DINGTALK_BASE_URL}/department/list`, {
      params: {
        access_token: accessToken,
        id: 1
      },
      timeout: 15000
    });
    console.log(`   完成，耗时 ${Date.now() - t2}ms`);
    console.log(`   errcode: ${deptRes.data.errcode}`);
    
    if (deptRes.data.errcode !== 0) {
      console.log('   错误:', deptRes.data.errmsg);
      return;
    }
    
    const departments = deptRes.data.department || [];
    console.log(`   部门数量: ${departments.length}`);
    console.log(`   部门列表:`);
    departments.forEach(d => console.log(`     - ${d.name} (id: ${d.id})`));
    
    console.log('\n3. 获取第一个部门的用户...');
    if (departments.length > 0) {
      const t3 = Date.now();
      const firstDept = departments[0];
      const userRes = await axios.post(
        `${DINGTALK_BASE_URL}/topapi/v2/user/list`,
        {
          dept_id: firstDept.id,
          cursor: 0,
          size: 10,
          language: 'zh_CN'
        },
        {
          params: { access_token: accessToken },
          timeout: 15000
        }
      );
      console.log(`   完成，耗时 ${Date.now() - t3}ms`);
      console.log(`   errcode: ${userRes.data.errcode}`);
      
      if (userRes.data.errcode !== 0) {
        console.log('   错误:', userRes.data.errmsg);
      } else {
        const users = userRes.data.result?.list || [];
        console.log(`   用户数量: ${users.length}`);
        users.forEach(u => console.log(`     - ${u.name} (userid: ${u.userid})`));
      }
    }
    
    console.log(`\n总耗时: ${Date.now() - start}ms`);
    
  } catch (error) {
    console.log('出错了:', error.message);
    console.log('总耗时:', Date.now() - start, 'ms');
  }
}

test();
