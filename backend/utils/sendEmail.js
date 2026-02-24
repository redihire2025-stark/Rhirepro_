const nodemailer = require("nodemailer");
const { google } = require("googleapis");

const oAuth2Client = new google.auth.OAuth2(
    process.env.EMAIL_CLIENT_ID,
    process.env.EMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
);

oAuth2Client.setCredentials({
    refresh_token: process.env.EMAIL_REFRESH_TOKEN,
});

const sendEmail = async (to, otp) => {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                type: "OAuth2",
                user: process.env.EMAIL_USER,
                clientId: process.env.EMAIL_CLIENT_ID,
                clientSecret: process.env.EMAIL_CLIENT_SECRET,
                refreshToken: process.env.EMAIL_REFRESH_TOKEN,
                accessToken: accessToken && accessToken.token ? accessToken.token : accessToken,
            },
        });

        const info = await transporter.sendMail({
            from: `"RhirePro Support" <${process.env.EMAIL_USER}>`,
            to,
            subject: "RhirePro - OTP for Password Reset",
            html: `
                <div style="font-family:Arial;padding:20px">
                    <h2>RhirePro Password Reset</h2>
                    <p>Your OTP is:</p>
                    <h1 style="letter-spacing:5px">${otp}</h1>
                    <p>This OTP expires in 5 minutes.</p>
                </div>
            `,
        });

        console.log("✅ OTP Email Sent:", info.messageId);
        return true;
    } catch (error) {
        console.error("❌ Email sending failed:", error);
        return false;
    }
};

module.exports = sendEmail;
