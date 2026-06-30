const DingTalkService = require('../services/dingtalkService');
const db = require('../models');

const dingTalkService = new DingTalkService(
  process.env.DINGTALK_APP_KEY,
  process.env.DINGTALK_APP_SECRET
);

function getDeptNameMap(departments) {
  const map = {};
  for (const dept of departments) {
    map[dept.id] = dept.name;
  }
  return map;
}

function getRoleFromTitle(title) {
  if (!title) return 'employee';
  const t = title.trim();
  if (t === '校长') return '校长';
  if (t.includes('副校长')) return '副校长';
  if (t.includes('教科室') || t.includes('教科处')) return '教科室主任';
  if (t.includes('教导') || t.includes('教务处')) return '教导主任';
  if (t.includes('德育') || t.includes('政教处') || t.includes('德育处')) return '德育主任';
  if (t.includes('教研组长') || t.includes('年级组长') || t.includes('学科组长')) return '教研组长';
  if (t.includes('组长') && !t.includes('教研组长') && !t.includes('年级组长')) return '组长';
  if (t.includes('财务') || t.includes('会计') || t.includes('出纳')) return '财务';
  return 'employee';
}

function getExcludedDeptIds(departments, excludeNames = ['家校通讯录']) {
  const excludedIds = new Set();
  const parentChildMap = {};
  
  for (const dept of departments) {
    const parentId = dept.parentid || 1;
    if (!parentChildMap[parentId]) {
      parentChildMap[parentId] = [];
    }
    parentChildMap[parentId].push(dept);
  }
  
  function addChildren(deptId) {
    excludedIds.add(deptId);
    const children = parentChildMap[deptId] || [];
    for (const child of children) {
      addChildren(child.id);
    }
  }
  
  for (const dept of departments) {
    if (excludeNames.includes(dept.name)) {
      addChildren(dept.id);
    }
  }
  
  return excludedIds;
}

const TARGET_ROLES = ['校长', '副校长', '教科室主任', '教导主任', '德育主任', '教研组长', '财务'];

async function syncUsers(req, res) {
  try {
    if (!process.env.DINGTALK_APP_KEY || !process.env.DINGTALK_APP_SECRET) {
      return res.status(400).json({ 
        success: false, 
        message: '请先配置钉钉AppKey和AppSecret' 
      });
    }

    const allDepartments = await dingTalkService.getAllDepartments();
    const deptNameMap = getDeptNameMap(allDepartments);
    const excludedDeptIds = getExcludedDeptIds(allDepartments, ['家校通讯录']);
    
    const validDepts = allDepartments.filter(d => !excludedDeptIds.has(d.id));
    console.log(`总部门数: ${allDepartments.length}, 有效部门数: ${validDepts.length} (已排除${allDepartments.length - validDepts.length}个家校通讯录部门`);
    
    const allUsers = [];
    const userSet = new Set();
    let processed = 0;

    for (const dept of validDepts) {
      processed++;
      try {
        const users = await dingTalkService.getDepartmentUsers(dept.id);
        for (const user of users) {
          if (!userSet.has(user.userid)) {
            userSet.add(user.userid);
            allUsers.push(user);
          }
        }
        if (processed % 20 === 0) {
          console.log(`已处理 ${processed}/${validDepts.length} 个部门，去重用户 ${allUsers.length} 人`);
        }
      } catch (error) {
        const deptName = deptNameMap[dept.id] || dept.id;
        console.warn(`获取部门 ${deptName} 用户失败:`, error.message);
      }
    }

    const roleUserMap = {};
    for (const roleName of TARGET_ROLES) {
      roleUserMap[roleName] = new Set();
    }

    try {
      const roleResult = await dingTalkService.getRoleList();
      const allRoles = [];
      if (roleResult.list) {
        for (const group of roleResult.list) {
          if (group.roles) {
            for (const role of group.roles) {
              allRoles.push({ ...role, groupName: group.name });
            }
          }
        }
      }
      console.log(`钉钉角色列表: ${allRoles.map(r => r.name).join(', ')}`);

      for (const role of allRoles) {
        let matched = false;
        for (const targetRole of TARGET_ROLES) {
          if (role.name === targetRole) {
            try {
              const userResult = await dingTalkService.getRoleUsers(role.id);
              if (userResult.list) {
                for (const user of userResult.list) {
                  roleUserMap[targetRole].add(user.userid);
                }
              }
              console.log(`角色 "${role.name}" (ID:${role.id}) 精确匹配目标角色 "${targetRole}"，包含 ${userResult.list?.length || 0} 人`);
            } catch (e) {
              console.warn(`获取角色 ${role.name} 用户列表失败:`, e.message);
            }
            matched = true;
            break;
          }
        }
        if (!matched) {
          if (role.name.includes('副校长')) {
            try {
              const userResult = await dingTalkService.getRoleUsers(role.id);
              if (userResult.list) {
                for (const user of userResult.list) {
                  roleUserMap['副校长'].add(user.userid);
                }
              }
              console.log(`角色 "${role.name}" (ID:${role.id}) 匹配目标角色 "副校长"，包含 ${userResult.list?.length || 0} 人`);
            } catch (e) {
              console.warn(`获取角色 ${role.name} 用户列表失败:`, e.message);
            }
          } else {
            for (const targetRole of TARGET_ROLES) {
              if (role.name.includes(targetRole)) {
                try {
                  const userResult = await dingTalkService.getRoleUsers(role.id);
                  if (userResult.list) {
                    for (const user of userResult.list) {
                      roleUserMap[targetRole].add(user.userid);
                    }
                  }
                  console.log(`角色 "${role.name}" (ID:${role.id}) 模糊匹配目标角色 "${targetRole}"，包含 ${userResult.list?.length || 0} 人`);
                } catch (e) {
                  console.warn(`获取角色 ${role.name} 用户列表失败:`, e.message);
                }
                break;
              }
            }
          }
        }
      }
    } catch (roleError) {
      console.warn('获取钉钉角色列表失败，将使用职位映射:', roleError.message);
    }

    let created = 0;
    let updated = 0;

    for (const dtUser of allUsers) {
      const existingUser = await db.User.findByDingtalkId(dtUser.userid);
      
      let deptNames = '';
      if (dtUser.dept_id_list && dtUser.dept_id_list.length > 0) {
        deptNames = dtUser.dept_id_list
          .map(id => deptNameMap[id])
          .filter(name => name)
          .join(',');
      }

      const title = dtUser.title || '';
      let role = getRoleFromTitle(title);

      for (const targetRole of TARGET_ROLES) {
        if (roleUserMap[targetRole].has(dtUser.userid)) {
          role = targetRole;
          break;
        }
      }
      
      let isMasterAdmin = false;
      if (dtUser.admin === true) {
        try {
          const userDetail = await dingTalkService.getUserDetail(dtUser.userid);
          const roleList = userDetail?.role_list || [];
          isMasterAdmin = roleList.some(r => r.name === '主管理员');
        } catch (detailError) {
          console.warn(`获取用户${dtUser.name}详情失败，设为非主管理员`, detailError.message);
        }
      }

      if (existingUser) {
        await db.User.update(existingUser.id, {
          name: dtUser.name || existingUser.name,
          department: deptNames || existingUser.department,
          mobile: dtUser.mobile || existingUser.mobile,
          title: title || existingUser.title,
          role: role || existingUser.role,
          is_admin: isMasterAdmin
        });
        updated++;
      } else {
        await db.User.create({
          dingtalk_userid: dtUser.userid,
          name: dtUser.name || '未知',
          department: deptNames || '',
          mobile: dtUser.mobile || '',
          title: title,
          role: role,
          is_admin: isMasterAdmin
        });
        created++;
      }
    }

    res.json({
      success: true,
      message: `同步完成，新增${created}人，更新${updated}人，总计${allUsers.length}人`
    });
  } catch (error) {
    console.error('同步钉钉用户失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '同步失败', 
      error: error.message 
    });
  }
}

async function getDepartments(req, res) {
  try {
    if (!process.env.DINGTALK_APP_KEY || !process.env.DINGTALK_APP_SECRET) {
      return res.status(400).json({ 
        success: false, 
        message: '请先配置钉钉AppKey和AppSecret' 
      });
    }

    const departments = await dingTalkService.getAllDepartments();
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('获取钉钉部门失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '获取部门失败', 
      error: error.message 
    });
  }
}

async function syncDepartmentUsers(req, res) {
  try {
    if (!process.env.DINGTALK_APP_KEY || !process.env.DINGTALK_APP_SECRET) {
      return res.status(400).json({ 
        success: false, 
        message: '请先配置钉钉AppKey和AppSecret' 
      });
    }

    const { deptId } = req.body;
    if (!deptId) {
      return res.status(400).json({ success: false, message: '请传入部门ID' });
    }

    const users = await dingTalkService.getDepartmentUsers(deptId);
    
    let created = 0;
    let updated = 0;

    for (const dtUser of users) {
      const existingUser = await db.User.findByDingtalkId(dtUser.userid);

      if (existingUser) {
        await db.User.update(existingUser.id, {
          name: dtUser.name || existingUser.name,
          department: dtUser.dept_id_list ? dtUser.dept_id_list.join(',') : existingUser.department,
          mobile: dtUser.mobile || existingUser.mobile
        });
        updated++;
      } else {
        await db.User.create({
          dingtalk_userid: dtUser.userid,
          name: dtUser.name || '未知',
          department: dtUser.dept_id_list ? dtUser.dept_id_list.join(',') : '',
          mobile: dtUser.mobile || '',
          role: 'employee'
        });
        created++;
      }
    }

    res.json({
      success: true,
      message: `同步完成，新增${created}人，更新${updated}人`
    });
  } catch (error) {
    console.error('同步部门用户失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '同步失败', 
      error: error.message 
    });
  }
}

module.exports = { syncUsers, getDepartments, syncDepartmentUsers };