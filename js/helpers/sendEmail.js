const nodemailer = require('nodemailer');
require('dotenv').config()

const creatHtml=(typeNro,button)=>{
html=`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Recovery</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; margin: auto;">
                    <tr>
                        <td style="padding: 40px 20px; text-align: center;">
                            ${typeNro==1?`<img src="https://cdn-icons-png.flaticon.com/256/6381/6381582.png" alt="Email Verification" style="max-width: 70%; height: auto; margin-bottom: 20px;">`:""}
                            ${typeNro==2?`<img src="https://static.vecteezy.com/system/resources/previews/010/998/284/original/3d-password-input-illustration-design-free-png.png" alt="Email Verification" style="max-width: 70%; height: auto; margin-bottom: 20px;">`:""}
                            ${typeNro==3?`<img src="https://cdn3d.iconscout.com/3d/premium/thumb/email-verify-6161730-5073621.png" alt="Email Verification" style="max-width: 70%; height: auto; margin-bottom: 20px;">`:""}
                            ${typeNro==1?`
                            <h1 style="color: #333333;">Welcome WSP.Plus</h1>
                            <p style="color: #666666;">Your account has been created succesfuly.</p>
                            `:""}
                            ${typeNro==2?`
                            <h1 style="color: #333333;">Verify your email</h1>
                            <p style="color: #666666;">Please, click in the following button to validate your email.</p>
                            `:""}
                            ${typeNro==3?`
                            <h1 style="color: #333333;">Password Recovery</h1>
                            <p style="color: #666666;">You have requested to reset your password. Click the button below to proceed.</p>
                            `:""}
                            ${button?`<a href="${button.link}" style="display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">${button.frase}</a>`:""}
                            <p style="color: #999999; margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
`
return html
}


const sendEmail=async({email,subject,typeNro,button})=>{

let mailTransporter =
	nodemailer.createTransport(
		{
            host: 'smtppro.zoho.com.au',
            port: 465,
            secure: true, // true for 465, false for other ports
			auth: {
				user: process.env.EMAIL_ACCOUNT,
				pass: process.env.EMAIL_CLAVE
			}
		}
	);

let mailDetails = {
	from:  `Mathias Sinclair <${process.env.EMAIL_ACCOUNT}>`,
	to: email,
	subject: `Chatter.plus: ${subject}`,
	html: creatHtml(typeNro,button)
};

mailTransporter
	.sendMail(mailDetails,
		function (err, data) {
			if (err) {
				console.log('Error Occurs',err.message);
			} else {
				console.log('Email sent successfully');
			}
    });
}

module.exports={sendEmail}