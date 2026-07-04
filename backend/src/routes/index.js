const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const applicationController = require('../controllers/applicationController');
const approvalController = require('../controllers/approvalController');
const locationController = require('../controllers/locationController');
const exportController = require('../controllers/exportController');
const dingtalkController = require('../controllers/dingtalkController');
const uploadController = require('../controllers/uploadController');

router.post('/auth/login', userController.login);
router.post('/auth/dingtalk-login', userController.dingtalkLogin);
router.post('/auth/dingtalk-qr-login', userController.dingtalkQrLogin);
router.get('/auth/userinfo', userController.getUserInfo);
router.post('/auth/logout', userController.logout);

router.get('/applications', applicationController.getApplications);
router.post('/applications', applicationController.createApplication);
router.get('/applications/:id', applicationController.getApplicationById);
router.put('/applications/:id', applicationController.updateApplication);
router.delete('/applications/:id', applicationController.deleteApplication);
router.post('/applications/:id/submit', applicationController.submitApplication);
router.post('/applications/:id/cancel', applicationController.cancelApplication);

router.get('/approvals/pending', approvalController.getPendingApprovals);
router.get('/approvals/pending-count', approvalController.getPendingCount);
router.post('/approvals/:id/approve', approvalController.approveApplication);
router.post('/approvals/:id/reject', approvalController.rejectApplication);

router.get('/locations', locationController.getLocations);
router.get('/locations/:id', locationController.getLocationById);

router.post('/upload', uploadController.upload.single('file'), uploadController.uploadFile);
router.delete('/upload/:filename', uploadController.deleteFile);

router.get('/admin/users', userController.getUsers);
router.put('/admin/users/:id/role', userController.updateUserRole);
router.get('/admin/locations', locationController.getAllLocations);
router.post('/admin/locations', locationController.createLocation);
router.put('/admin/locations/:id', locationController.updateLocation);
router.delete('/admin/locations/:id', locationController.deleteLocation);
router.get('/admin/export', exportController.exportMonthlyData);

router.post('/admin/dingtalk/sync', dingtalkController.syncUsers);
router.get('/admin/dingtalk/departments', dingtalkController.getDepartments);
router.post('/admin/dingtalk/sync-dept', dingtalkController.syncDepartmentUsers);

module.exports = router;
