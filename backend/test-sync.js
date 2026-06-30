require('dotenv').config();
const axios = require('axios');

const DINGTALK_BASE_URL = 'https://oapi.dingtalk.com';

const dingtalkAxios = axios.create({
  timeout: 30000,
  baseURL: DINGTALK_BASE_URL
});

let accessToken = null;

async function getAccessToken() {
  if (accessToken) return accessToken;
  
  const res = await dingtalkAxios.get('/gettoken', {
    params: {
      appkey: process.env.DINGTALK_APP_KEY,
      appsecret: process.env.DINGTALK_APP_SECRET
    }
  });
  
  accessToken = res.data.access_token;
  return accessToken;
}

async function getDepartmentUsers(deptId, deptName) {
  const token = await getAccessToken();
  const users = [];
  let cursor = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await dingtalkAxios.post('/topapi/v2/user/list', {
      dept_id: deptId,
      cursor: cursor,
      size: 100,
      language: 'zh_CN'
    }, {
      params: { access_token: token }
    });

    if (res.data.errcode !== 0) {
      console.log(`  [错误] ${deptName}: ${res.data.errmsg}`);
      break;
    }

    if (res.data.result?.list) {
      users.push(...res.data.result.list);
    }

    hasMore = res.data.result?.has_more || false;
    cursor = res.data.result?.next_cursor || 0;
  }

  return users;
}

async function testSync() {
  console.log('开始测试同步...');
  const start = Date.now();

  try {
    const token = await getAccessToken();
    console.log('1. 获取access_token成功');

    const deptRes = await dingtalkAxios.get('/department/list', {
      params: { access_token: token, id: 1 }
    });
    const departments = deptRes.data.department || [];
    console.log(`2. 获取部门列表成功，共 ${departments.length} 个部门`);

    console.log('\n3. 开始获取所有部门用户（并发）...');
    const userSet = new Set();
    const allUsers = [];
    let completed = 0;

    const batchSize = 10;
    for (let i = 0; i < departments.length; i += batchSize) {
      const batch = departments.slice(i, i + batchSize);
      const promises = batch.map(async (dept) => {
        try {
          const users = await getDepartmentUsers(dept.id, dept.name);
          return { dept, users };
        } catch (err) {
          console.log(`  [失败] ${dept.name}: ${err.message}`);
          return { dept, users: [] };
        }
      });

      const results = await Promise.all(promises);
      for (const { dept, users } of results) {
        for (const user of users) {
          if (!userSet.has(user.userid)) {
            userSet.add(user.userid);
            allUsers.push(user);
          }
        }
        completed++;
      }
      
      console.log(`  已处理 ${completed}/${departments.length} 个部门，去重用户 ${allUsers.length} 人`);
    }

    console.log(`\n总用户数（去重后）: ${allUsers.length}`);
    console.log(`总耗时: ${((Date.now() - start) / 1000).toFixed(1)} 秒`);

    console.log('\n前10个用户:');
    allUsers.slice(0, 10).forEach(u => console.log(`  - ${u.name} (${u.userid})`));

  } catch (error) {
    console.log('出错了:', error.message);
    console.log('总耗时:', ((Date.now() - start) / 1000).toFixed(1), '秒');
  }
}

testSync();
