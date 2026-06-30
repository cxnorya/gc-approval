let users = [
  { id: 1, dingtalk_userid: 'admin', name: '管理员', department: '行政部', role: 'admin' },
  { id: 2, dingtalk_userid: 'approver', name: '审批负责人', department: '管理层', role: 'approver' },
  { id: 3, dingtalk_userid: 'employee', name: '普通员工', department: '技术部', role: 'employee' }
];

let locations = [
  { id: 'A001', name: '本市本区', amount: 100, status: 1 },
  { id: 'A002', name: '本市外区', amount: 150, status: 1 },
  { id: 'A003', name: '省内其他城市', amount: 250, status: 1 },
  { id: 'A004', name: '省外一线城市', amount: 400, status: 1 },
  { id: 'A005', name: '省外其他城市', amount: 300, status: 1 }
];

let applications = [
  {
    id: 1,
    applicant_id: 3,
    approver_id: 2,
    apply_date: '2026-06-14',
    travel_date: '2026-06-15',
    reason: '参加技术培训',
    location_id: 'A004',
    person_count: 2,
    amount: 1280,
    status: 'pending',
    reject_reason: null,
    approver_comment: null,
    approved_at: null,
    created_at: '2026-06-14 10:00:00',
    updated_at: '2026-06-14 10:00:00'
  },
  {
    id: 2,
    applicant_id: 3,
    approver_id: 2,
    apply_date: '2026-06-13',
    travel_date: '2026-06-14',
    reason: '客户拜访',
    location_id: 'A002',
    person_count: 1,
    amount: 150,
    status: 'approved',
    reject_reason: null,
    approver_comment: '同意',
    approved_at: '2026-06-13 15:00:00',
    created_at: '2026-06-13 09:00:00',
    updated_at: '2026-06-13 15:00:00'
  }
];

let nextApplicationId = 3;

function calculateAmount(personCount, locationAmount) {
  if (personCount <= 0) {
    throw new Error('出行人数必须大于0');
  }
  if (personCount === 1) {
    return personCount * locationAmount;
  } else {
    const discount = Math.max(0.3, 1 - personCount * 0.1);
    return Math.round(personCount * locationAmount * discount);
  }
}

let nextUserId = 4;

const db = {
  users: {
    findByDingtalkUserId: (dingtalk_userid) => {
      return users.find(u => u.dingtalk_userid === dingtalk_userid);
    },
    findById: (id) => {
      return users.find(u => u.id === parseInt(id));
    },
    findByName: (name) => {
      return users.find(u => u.name === name);
    },
    findAll: () => users,
    updateRole: (id, role) => {
      const user = users.find(u => u.id === parseInt(id));
      if (user) {
        user.role = role;
      }
    },
    create: (data) => {
      const user = {
        id: nextUserId++,
        dingtalk_userid: data.dingtalk_userid,
        name: data.name || '未知',
        department: data.department || '',
        mobile: data.mobile || '',
        role: data.role || 'employee'
      };
      users.push(user);
      return { insertId: user.id };
    },
    update: (id, data) => {
      const user = users.find(u => u.id === parseInt(id));
      if (user) {
        if (data.name !== undefined) user.name = data.name;
        if (data.department !== undefined) user.department = data.department;
        if (data.mobile !== undefined) user.mobile = data.mobile;
        if (data.role !== undefined) user.role = data.role;
      }
    }
  },
  locations: {
    findAllActive: () => locations.filter(l => l.status === 1),
    findAll: () => locations,
    findById: (id) => locations.find(l => l.id === id || l.id === String(id)),
    create: (location) => {
      locations.push({ ...location, status: 1 });
    },
    update: (id, data) => {
      const index = locations.findIndex(l => l.id === id);
      if (index !== -1) {
        locations[index] = { ...locations[index], ...data };
      }
    },
    delete: (id) => {
      const index = locations.findIndex(l => l.id === id);
      if (index !== -1) {
        locations.splice(index, 1);
      }
    }
  },
  applications: {
    findAll: () => applications,
    findByApplicantId: (applicant_id) => {
      return applications.filter(a => a.applicant_id === parseInt(applicant_id));
    },
    findByApproverId: (approver_id) => {
      return applications.filter(a => a.approver_id === parseInt(approver_id));
    },
    findByStatus: (status) => {
      return applications.filter(a => a.status === status);
    },
    findById: (id) => {
      return applications.find(a => a.id === parseInt(id));
    },
    create: (data) => {
      const location = locations.find(l => l.id === data.location_id);
      const amount = calculateAmount(data.person_count, location?.amount || 0);
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
      const application = {
        id: nextApplicationId++,
        ...data,
        amount,
        status: 'draft',
        reject_reason: null,
        approver_comment: null,
        approved_at: null,
        created_at: now,
        updated_at: now
      };
      applications.push(application);
      return { id: application.id, amount };
    },
    update: (id, data) => {
      const index = applications.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        applications[index] = { ...applications[index], ...data, updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19) };
      }
    },
    delete: (id) => {
      const index = applications.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        applications.splice(index, 1);
      }
    },
    updateStatus: (id, status, comment = null, reason = null) => {
      const index = applications.findIndex(a => a.id === parseInt(id));
      if (index !== -1) {
        applications[index] = {
          ...applications[index],
          status,
          approver_comment: comment,
          reject_reason: reason,
          approved_at: status !== 'pending' ? new Date().toISOString().replace('T', ' ').slice(0, 19) : null,
          updated_at: new Date().toISOString().replace('T', ' ').slice(0, 19)
        };
      }
    }
  },
  calculateAmount
};

module.exports = db;
