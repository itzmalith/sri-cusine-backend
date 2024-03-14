const crypto = require('crypto');
var config = require('config');
const moment = require('moment');

function generateResetPasswordToken() {
  return crypto.randomBytes(32).toString('hex');
}



async function generateRandomNum () {
	var randomNum = await Math.floor(100000 + Math.random() * 900000);
	return String(randomNum);
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000); 
}

module.exports ={
    generateResetPasswordToken,
    generateRandomNum,
    generateOTP


}