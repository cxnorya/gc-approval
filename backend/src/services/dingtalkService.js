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

  // 新版钉钉待办接口（创建）
  async createTodoTask(unionId, subject, description, executorIds, detailUrl) {
    try {
      const accessToken = await this.getNewAccessToken();
      
      // 添加请求日志
      console.log('创建钉钉待办任务:', {
        unionId,
        subject,
        executorIds,
        detailUrl: detailUrl ? '已设置' : '未设置'
      });
      
      const response = await axios.post(
        `https://api.dingtalk.com/v1.0/todo/users/${unionId}/tasks`,
        {
          sourceId: `approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // 避免重复
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
      
      console.log('钉钉待办创建成功:', response.data);
      
      if (response.data && response.data.code !== undefined && response.data.code !== 0) {
        throw new Error(`创建待办任务失败: ${response.data.message || '未知错误'}`);
      }
      
      return response.data;
    } catch (error) {
      // 详细错误日志
      console.error('创建钉钉待办失败:');
      console.error('  错误信息:', error.message);
      if (error.response) {
        console.error('  响应状态:', error.response.status);
        console.error('  响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // 新版钉钉待办接口（更新状态）
  async updateTodoTask(unionId, taskId, isDone) {
    try {
      const accessToken = await this.getNewAccessToken();
      
      // 添加请求日志
      console.log('更新钉钉待办状态:', {
        unionId,
        taskId,
        isDone
      });
      
      const response = await axios.patch(
        `https://api.dingtalk.com/v1.0/todo/users/${unionId}/tasks/${taskId}`,
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
      
      console.log('钉钉待办状态更新成功:', response.data);
      
      return response.data;
    } catch (error) {
      // 详细错误日志
      console.error('更新钉钉待办状态失败:');
      console.error('  错误信息:', error.message);
      console.error('  参数: unionId=' + unionId + ', taskId=' + taskId + ', isDone=' + isDone);
      if (error.response) {
        console.error('  响应状态:', error.response.status);
        console.error('  响应数据:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }

  // 旧版钉钉待办接口（创建）- 修正为正确的 request 结构（直接使用 request 对象）
  async createTodoTaskLegacy(processInstanceId, userId, title, url, description = '') {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        'https://oapi.dingtalk.com/topapi/process/workrecord/task/create',
        {
          request: {
            process_instance_id: processInstanceId,
            activity_id: 'approval',
            manager: userId,
            formItemList: [
              { title: '标题', content: title },
              { title: '详情', content: description || '请点击查看并处理' }
            ],
            url: url
          }
        },
        {
          params: { access_token: token }
        }
      );

      if (response.data.errcode === 0) {
        console.log(`✅ 待办创建成功: ${processInstanceId} -> ${userId}`);
        return response.data;
      } else {
        console.error('❌ 创建待办失败:', response.data);
        throw new Error(response.data.errmsg);
      }
    } catch (error) {
      console.error('❌ 调用待办创建API失败:', error.message);
      throw error;
    }
  }

  // 旧版钉钉待办接口（更新状态）
  async updateTodoTaskLegacy(processInstanceId, status = 'completed') {
    try {
      const token = await this.getAccessToken();
      const response = await axios.post(
        'https://oapi.dingtalk.com/topapi/process/workrecord/update',
        {
          request: {
            process_instance_id: processInstanceId,
            status: status
          }
        },
        {
          params: { access_token: token }
        }
      );

      if (response.data.errcode === 0) {
        console.log(`✅ 待办更新成功: ${processInstanceId} -> ${status}`);
      } else {
        console.error('❌ 更新待办失败:', response.data);
        throw new Error(response.data.errmsg);
      }
      return response.data;
    } catch (error) {
      console.error('❌ 调用待办更新API失败:', error.message);
      throw error;
    }
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
}

module.exports = DingTalkService;