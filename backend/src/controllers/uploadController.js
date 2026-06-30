const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, filename);
  }
});

const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，仅支持图片、PDF和Word文档'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

async function uploadFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请选择要上传的文件' });
    }

    // 修复中文文件名编码问题：multer默认使用latin1编码，需要转换为utf8
    let originalname = req.file.originalname;
    try {
      originalname = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    } catch (e) {
      // 如果转换失败，使用原始名称
    }

    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        originalname: originalname,
        url: `/uploads/${req.file.filename}`,
        size: req.file.size
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '上传失败', error: error.message });
  }
}

async function deleteFile(req, res) {
  const { filename } = req.params;
  
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      res.json({ success: true, message: '删除成功' });
    } else {
      res.status(404).json({ success: false, message: '文件不存在' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: '删除失败', error: error.message });
  }
}

module.exports = {
  upload,
  uploadFile,
  deleteFile
};
