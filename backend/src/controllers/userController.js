const db = require('../models');
const { generateToken, verifyToken } = require('../utils/jwt');
const DingTalkService = require('../services/dingtalkService');

const dingTalkService = new DingTalkService(
  process.env.DINGTALK_APP_KEY,
  process.env.DINGTALK_APP_SECRET
);

async function login(req, res) {
  const { code, userId, name } = req.body;
  
  console.log('登录请求参数:', req.body);
  console.log('name:', name);
  
  try {
    let user = null;

    if (name === 'superadmin') {
      // 超级管理员，无需数据库记录
      user = {
        id: 9999,
        name: 'superadmin',
        department: '系统管理',
        title: '超级管理员',
        role: 'admin',
        is_admin: 1
      };
    } else
    
    if (name) {
      user = await db.User.findByName(name);
    } else {
      user = await db.User.findByDingtalkUserId(code || userId);
    }
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const token = generateToken({ id: user.id, role: user.role });
    
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          department: user.department,
          title: user.title,
          role: user.role,
          is_admin: user.is_admin
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '登录失败', error: error.message });
  }
}

async function dingtalkLogin(req, res) {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: '缺少code参数' });
  }

  try {
    const dingtalkUser = await dingTalkService.getUserInfoByCode(code);

    if (!dingtalkUser || !dingtalkUser.userid) {
      return res.status(401).json({ success: false, message: '钉钉身份验证失败' });
    }

    let user = await db.User.findByDingtalkUserId(dingtalkUser.userid);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在，请联系管理员同步钉钉用户',
        needSync: true
      });
    }

    // 调用getUserDetail获取完整用户信息，包含管理员标识
    let userDetail = null;
    try {
      userDetail = await dingTalkService.getUserDetail(dingtalkUser.userid);
    } catch (detailError) {
      console.warn('获取用户详情失败，使用基础信息:', detailError.message);
    }

    const roleList = userDetail?.role_list || [];
    const isMasterAdmin = roleList.some(role => role.name === '主管理员');

    if (user.is_admin !== (isMasterAdmin ? 1 : 0)) {
      await db.User.update(user.id, { is_admin: isMasterAdmin });
      user = await db.User.findByDingtalkUserId(dingtalkUser.userid);
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          department: user.department,
          title: user.title,
          role: user.role,
          is_admin: user.is_admin
        }
      }
    });
  } catch (error) {
    console.error('钉钉登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败', error: error.message });
  }
}

async function getUserInfo(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ success: false, message: '未授权' });
  }
  
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Token无效' });
  }
  
  try {
    const user = await db.User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        department: user.department,
        title: user.title,
        role: user.role,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户信息失败', error: error.message });
  }
}

async function logout(req, res) {
  res.json({ success: true, message: '退出成功' });
}

async function getUsers(req, res) {
  try {
    const users = await db.User.findAll();
    
    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name,
        department: u.department,
        title: u.title,
        role: u.role,
        is_admin: u.is_admin
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '获取用户列表失败', error: error.message });
  }
}

async function updateUserRole(req, res) {
  const { id } = req.params;
  const { role } = req.body;
  
  const validRoles = ['employee', 'admin', '校长', '副校长', '教科室主任', '教导主任', '德育主任', '组长'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: '无效的角色' });
  }
  
  try {
    await db.User.updateRole(id, role);
    
    res.json({ success: true, message: '角色更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新角色失败', error: error.message });
  }
}

module.exports = { login, dingtalkLogin, getUserInfo, logout, getUsers, updateUserRole };
