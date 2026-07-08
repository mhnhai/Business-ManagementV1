import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { RouteError } from '@src/common/utils/route-errors';
import { Errors, ISessionUser } from '@src/models/common/types';
import { IUser } from '@src/models/User.model';
import AuthRepo from '@src/repos/AuthRepo';
import UserRepo from '@src/repos/UserRepo';
import JwtUtils from '@src/common/utils/session-authenticate'
import EnvVars from '@src/common/constants/env';
import nodemailer from 'nodemailer';
import { logger } from '@src/common/utils/logger'; 

/******************************************************************************
                                Functions
******************************************************************************/

async function authenticate(username: string, passwordInput: string): Promise<IUser> {
  const user = await UserRepo.getOne(username);
  if (!user) {
    logger.warn('SYSTEM', `Đăng nhập thất bại: Tài khoản "${username}" không tồn tại.`);
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, Errors.INVALID_CREDENTIALS);
  }
  if (!user.isActivated) {
    logger.warn('SYSTEM', `Đăng nhập thất bại: Tài khoản "${username}" chưa được kích hoạt.`);
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, Errors.INVALID_CREDENTIALS);
  }
  const isMatch = await UserRepo.comparePassword(passwordInput, user.password);
  if (!isMatch) {
    logger.warn('SYSTEM', `Đăng nhập thất bại: Tài khoản "${username}" nhập sai mật khẩu.`);
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, Errors.INVALID_CREDENTIALS);
  }

  logger.info('SYSTEM', `Tài khoản "${username}" (ID: ${user.id}) đăng nhập thành công.`);
  return user;
}

async function refresh(token: string) {
  try {
    const tokenDb = await AuthRepo.findToken(token);
    if (!tokenDb) {
      logger.warn('SYSTEM', 'Làm mới token thất bại: Refresh token không tồn tại trong database.');
      throw new Error('Token not found in database');
    }

    if (tokenDb.expires_at < new Date()) {
      await AuthRepo.deleteToken(token);
      logger.warn('SYSTEM', `Làm mới token thất bại: Refresh token của tài khoản "${tokenDb.user.username}" đã hết hạn và đã bị xóa.`);
      throw new Error('Token expired');
    }

    await JwtUtils.verifyToken(token, EnvVars.JwtRefreshTokenKey);

    const sessionUser: ISessionUser = {
      userId: tokenDb.user.user_id,
      username: tokenDb.user.username,
      role: tokenDb.user.role,
    };

    const accessToken = JwtUtils.generateAccessToken(sessionUser);
    logger.info('SYSTEM', `Cấp lại Access Token thành công cho tài khoản "${sessionUser.username}".`);
    return accessToken;
  } catch (error) {
    logger.error('SYSTEM', `Lỗi hệ thống trong quá trình làm mới token: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Cấu hình nodemailer transporter dùng chung nội bộ
function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EnvVars.MailUser,
      pass: EnvVars.MailPass,
    },
  });
}

async function sendVerificationLinkEmail(email: string, username: string, token: string): Promise<void> {
  try {
    const transporter = getMailTransporter();
    const verificationLink = `${EnvVars.FrontendUrl}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"Management System" <${EnvVars.MailUser}>`,
      to: email,
      subject: 'Activate Your Account',
      html: `
        <div style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; padding-top: 40px; padding-bottom: 40px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; margin: 0 auto;">
            <tr><td style="background-color: #4f46e5; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            <tr>
              <td style="padding: 40px 32px; text-align: left;">
                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700; line-height: 32px;">Welcome aboard, ${username}!</h2>
                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 24px;"> Thank you for creating an account with our platform. To complete your registration and secure your profile, please verify your email address. </p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <a href="${verificationLink}" target="_blank" style="background-color: #4f46e5; color: #ffffff; padding: 12px 32px; text-decoration: none; display: inline-block; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);"> Activate Account </a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 13px; line-height: 20px; font-style: italic; text-align: center;"> Note: This secure activation link is valid for <strong>1 hour</strong> only. </p>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; line-height: 20px;"> If the button above doesn't work, please copy and paste this URL directly into your web browser: </p>
                <p style="margin: 0; color: #4f46e5; font-size: 13px; line-height: 20px; word-break: break-all;">
                  <a href="${verificationLink}" target="_blank" style="color: #4f46e5; text-decoration: underline;">${verificationLink}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 18px;"> This is an automated security system notification message. Please do not reply directly to this email. </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('SYSTEM', `Gửi email xác thực tài khoản thành công tới địa chỉ: ${email} (Tài khoản: "${username}").`);
  } catch (error) {
    logger.error('SYSTEM', `Gửi email xác thực tài khoản tới ${email} thất bại: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Gửi email chứa liên kết khôi phục lại mật khẩu cho tài khoản
 */
async function sendForgotPasswordEmail(email: string, username: string, token: string): Promise<void> {
  try {
    const transporter = getMailTransporter();
    const resetLink = `${EnvVars.FrontendUrl}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"Management System" <${EnvVars.MailUser}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; padding-top: 40px; padding-bottom: 40px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; margin: 0 auto;">
            <tr><td style="background-color: #ea580c; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            <tr>
              <td style="padding: 40px 32px; text-align: left;">
                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700; line-height: 32px;">Hi ${username},</h2>
                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 24px;"> Chúng tôi đã nhận được yêu cầu khôi phục mật khẩu từ tài khoản của bạn. Vui lòng bấm vào nút dưới đây để thiết lập mật khẩu mới: </p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <a href="${resetLink}" target="_blank" style="background-color: #ea580c; color: #ffffff; padding: 12px 32px; text-decoration: none; display: inline-block; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12 rgba(234, 88, 12, 0.25);"> Đặt lại mật khẩu </a>
                    </td>
                  </tr>
                </table>
                <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 13px; line-height: 20px; font-style: italic; text-align: center;"> Lưu ý: Liên kết bảo mật này chỉ có hiệu lực trong vòng <strong>15 phút</strong>. </p>
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 22px;"> Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email này một cách an toàn. </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 18px;"> Hệ thống thông báo bảo mật tự động. Vui lòng không phản hồi email này. </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('SYSTEM', `Gửi email yêu cầu khôi phục mật khẩu thành công tới: ${email}.`);
  } catch (error) {
    logger.error('SYSTEM', `Gửi email khôi phục mật khẩu tới ${email} thất bại: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Gửi email thông báo tài khoản kích hoạt thành công
 */
async function sendActivationSuccessEmail(email: string, username: string): Promise<void> {
  try {
    const transporter = getMailTransporter();
    const loginLink = `${EnvVars.FrontendUrl}/auth`;

    const mailOptions = {
      from: `"Management System" <${EnvVars.MailUser}>`,
      to: email,
      subject: 'Account Activated Successfully!',
      html: `
        <div style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 100%; padding-top: 40px; padding-bottom: 40px;">
          <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; margin: 0 auto;">
            <tr><td style="background-color: #10b981; height: 6px; font-size: 0; line-height: 0;">&nbsp;</td></tr>
            <tr>
              <td style="padding: 40px 32px; text-align: left;">
                <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 700; line-height: 32px;">Chúc mừng ${username}!</h2>
                <p style="margin: 0 0 24px 0; color: #64748b; font-size: 15px; line-height: 24px;"> Tài khoản của bạn đã được kích hoạt thành công trên hệ thống. Bây giờ bạn đã có thể truy cập đầy đủ các tính năng bằng tài khoản của mình. </p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <a href="${loginLink}" target="_blank" style="background-color: #10b981; color: #ffffff; padding: 12px 32px; text-decoration: none; display: inline-block; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);"> Đăng nhập ngay </a>
                    </td>
                  </tr>
                </table>
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 22px;"> Cảm ơn bạn đã đồng hành cùng chúng tôi! </p>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 18px;"> Hệ thống thông báo tự động. Vui lòng không phản hồi email này. </p>
              </td>
            </tr>
          </table>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    logger.info('SYSTEM', `Gửi email thông báo kích hoạt thành công tới địa chỉ: ${email}.`);
  } catch (error) {
    logger.error('SYSTEM', `Gửi email thông báo kích hoạt tới ${email} thất bại: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  authenticate,
  refresh,
  sendVerificationLinkEmail,
  sendForgotPasswordEmail,
  sendActivationSuccessEmail
} as const;