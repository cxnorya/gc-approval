const axios = require('axios');

const DINGTALK_BASE_URL = 'https://oapi.dingtalk.com';

const dingtalkAxios = axios.create({
  timeout: 30000,
  baseURL: DINGTALK_BASE_URL
});

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class DingTalkService {
  constructor(appKey, appSecret) {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.accessToken = null;
    this.tokenExpireTime = 0;
    this.lastRequestTime = 0;
    this.requestInterval = 50;
  }

  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.requestInterval) {
      await sleep(this.requestInterval - elapsed);
    }
    this.lastRequestTime = Date.now();
  }

  async getAccessToken() {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpireTime) {
      return this.accessToken;
    }

    const params = {
      appkey: this.appKey,
      appsecret: this.appSecret
    };

    const response = await dingtalkAxios.get('/gettoken', { params });
    const data = response.data;

    if (data.errcode !== 0) {
      throw new Error(`获取access_token失败: ${data.errmsg}`);
    }

    this.accessToken = data.access_token;
    this.tokenExpireTime = now + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  async getDepartmentList(parentId = 1) {
    await this.throttle();
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken,
      id: parentId
    };

    const response = await dingtalkAxios.get('/department/list', { params });
    const data = response.data;

    if (data.errcode !== 0) {
      throw new Error(`获取部门列表失败: ${data.errmsg}`);
    }

    return data.department || [];
  }

  async getAllDepartments() {
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken,
      id: 1
    };

    const response = await dingtalkAxios.get('/department/list', { params });
    const data = response.data;

    if (data.errcode !== 0) {
      throw new Error(`获取部门列表失败: ${data.errmsg}`);
    }

    return data.department || [];
  }

  async getDepartmentUsers(deptId, retries = 3) {
    await this.throttle();
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };

    const users = [];
    let cursor = 0;
    let hasMore = true;

    while (hasMore) {
      const data = {
        dept_id: deptId,
        cursor: cursor,
        size: 100,
        language: 'zh_CN'
      };

      try {
        const response = await dingtalkAxios.post('/topapi/v2/user/list', data, { params });
        const result = response.data;

        if (result.errcode !== 0) {
          if (result.errcode === 90018 && retries > 0) {
            console.log(`触发限流，1秒后重试... (剩余${retries - 1}次)`);
            await sleep(1000);
            return this.getDepartmentUsers(deptId, retries - 1);
          }
          throw new Error(`获取部门用户失败: ${result.errmsg}`);
        }

        if (result.result && result.result.list) {
          users.push(...result.result.list);
        }

        hasMore = result.result?.has_more || false;
        cursor = result.result?.next_cursor || 0;
      } catch (error) {
        if (retries > 0 && error.message?.includes('90018')) {
          console.log(`触发限流，1秒后重试... (剩余${retries - 1}次)`);
          await sleep(1000);
          return this.getDepartmentUsers(deptId, retries - 1);
        }
        throw error;
      }
    }

    return users;
  }

  async getAllUsers() {
    const departments = await this.getAllDepartments();
    const allUsers = [];
    const userSet = new Set();
    let processed = 0;

    console.log(`开始同步用户，共 ${departments.length} 个部门...`);

    for (const dept of departments) {
      processed++;
      try {
        const users = await this.getDepartmentUsers(dept.id);
        for (const user of users) {
          if (!userSet.has(user.userid)) {
            userSet.add(user.userid);
            allUsers.push(user);
          }
        }
        if (processed % 20 === 0) {
          console.log(`已处理 ${processed}/${departments.length} 个部门，去重用户 ${allUsers.length} 人`);
        }
      } catch (error) {
        console.warn(`获取部门 ${dept.name} 用户失败:`, error.message);
      }
    }

    console.log(`同步完成，共 ${allUsers.length} 个用户`);
    return allUsers;
  }

  async getUserInfoByCode(code) {
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };
    const data = {
      code: code
    };

    const response = await dingtalkAxios.post('/topapi/v2/user/getuserinfo', data, { params });
    const result = response.data;

    if (result.errcode !== 0) {
      throw new Error(`获取用户信息失败: ${result.errmsg}`);
    }

    return result.result;
  }

  async getUserDetail(userid) {
    await this.throttle();
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };
    const data = {
      userid: userid
    };

    const response = await dingtalkAxios.post('/topapi/v2/user/get', data, { params });
    const result = response.data;

    if (result.errcode !== 0) {
      throw new Error(`获取用户详情失败: ${result.errmsg}`);
    }

    return result.result;
  }

  async getRoleList() {
    await this.throttle();
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };
    const data = {
      size: 200,
      offset: 0
    };

    const response = await dingtalkAxios.post('/topapi/role/list', data, { params });
    const result = response.data;

    if (result.errcode !== 0) {
      throw new Error(`获取角色列表失败: ${result.errmsg}`);
    }

    return result.result;
  }

  async getRoleUsers(roleId) {
    await this.throttle();
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };
    const data = {
      role_id: roleId,
      size: 100,
      offset: 0
    };

    const response = await dingtalkAxios.post('/topapi/role/simplelist', data, { params });
    const result = response.data;

    if (result.errcode !== 0) {
      throw new Error(`获取角色用户列表失败: ${result.errmsg}`);
    }

    return result.result;
  }

  async getNewAccessToken() {
    const params = {
      appkey: this.appKey,
      appsecret: this.appSecret
    };

    const response = await dingtalkAxios.get('/gettoken', { params });
    const data = response.data;

    if (data.errcode !== 0) {
      throw new Error(`获取access_token失败: ${data.errmsg}`);
    }

    return data.access_token;
  }

  async createTodoTask(unionId, subject, description, executorIds, detailUrl) {
    const accessToken = await this.getNewAccessToken();
    
    const response = await axios.post(
      `https://api.dingtalk.com/v1.0/todo/users/${unionId}/tasks`,
      {
        sourceId: `approval_${Date.now()}`,
        subject: subject,
        description: description,
        executorIds: executorIds,
        detailUrl: {
          appUrl: detailUrl,
          pcUrl: detailUrl
        }
      },
      {
        headers: {
          'x-acs-dingtalk-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.code !== undefined && response.data.code !== 0) {
      throw new Error(`创建待办任务失败: ${response.data.message || '未知错误'}`);
    }

    return response.data;
  }

  async sendWorkNotice(userid, title, content, messageUrl = null) {
    const accessToken = await this.getAccessToken();
    const params = {
      access_token: accessToken
    };

    let msg;
    if (messageUrl) {
      msg = {
        msgtype: 'link',
        link: {
          title: title,
          text: content,
          messageUrl: messageUrl,
          picUrl: 'https://img.alicdn.com/tfs/TB1NwmBEL9TBuNjy1zbXXXpepXa-2400-1218.png'
        }
      };
    } else {
      msg = {
        msgtype: 'text',
        text: {
          content: `${title}\n\n${content}`
        }
      };
    }

    const response = await dingtalkAxios.post('/topapi/message/corpconversation/asyncsend_v2', {
      agent_id: process.env.DINGTALK_AGENT_ID,
      userid_list: userid,
      msg: msg
    }, { params });

    const result = response.data;

    if (result.errcode !== 0) {
      throw new Error(`发送工作通知失败: ${result.errmsg}`);
    }

    return result;
  }
  async updateTodoTask(unionId, taskId, isDone) {
    const accessToken = await this.getNewAccessToken();
    const response = await axios.patch(
      'https://api.dingtalk.com/v1.0/todo/users/' + unionId + '/tasks/' + taskId,
      {
        isDone: isDone,
        status: isDone ? 1 : 0
      },
      {
        headers: {
          'x-acs-dingtalk-access-token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  }



  async updateTodoTask(unionId, taskId, isDone) {
      const accessToken = await this.getNewAccessToken();
      const response = await axios.patch(
        'https://api.dingtalk.com/v1.0/todo/users/' + unionId + '/tasks/' + taskId,
        {
          isDone: isDone,
          status: isDone ? 1 : 0
        },
        {
          headers: {
            'x-acs-dingtalk-access-token': accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    }
}

 module.exports = DingTalkService;