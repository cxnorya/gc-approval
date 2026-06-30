const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  try {
    const testFile = fs.createReadStream(path.join(__dirname, 'test.txt'));
    
    const formData = new (require('form-data'))();
    formData.append('file', testFile, 'test.txt');
    
    const response = await axios.post('http://localhost:3000/api/upload', formData, {
      headers: { ...formData.getHeaders() }
    });
    
    console.log('上传响应:', response.data);
  } catch (error) {
    console.error('上传失败:', error.response?.data || error.message);
  }
}

// 创建测试文件
fs.writeFileSync(path.join(__dirname, 'test.txt'), 'test content');

testUpload().then(() => {
  fs.unlinkSync(path.join(__dirname, 'test.txt'));
});
