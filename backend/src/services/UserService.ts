import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { AuthErrors as Errors } from '@src/common/constants/service-errors';
import { RouteError } from '@src/common/utils/route-errors';
import User,{ IUser, IUserCreate, IUserPublic } from '@src/models/User.model';
import ActivityRepo from '@src/repos/ActivityRepo';
import UserRepo, { type SellerScope } from '@src/repos/UserRepo';
import { logger } from '@src/common/utils/logger'; 
import {
  assertOwnUserStatsAccess,
  assertSellerStatsAccess,
  parseSellerScope,
} from '@src/services/stats-access';

/******************************************************************************
                                   Functions
******************************************************************************/

async function getOne(username: string): Promise<IUser | null> {
  return UserRepo.getOne(username);
}

function getAll(): Promise<IUserPublic[]> {
  return UserRepo.getAll();
}

function getAllUnactivated(): Promise<IUserPublic[]> {
  return UserRepo.getAllUnactivated();
}

function search(query: string): Promise<IUserPublic[]> {
  return UserRepo.search(query);
}

async function addOne(user: IUserCreate): Promise<IUserPublic> {
  try {
    const createdUser = await UserRepo.add(user);
    logger.info('SYSTEM', `Thêm mới người dùng thành công: Tài khoản "${createdUser.username}" (Quyền: ${createdUser.role}).`);
    return createdUser;
  } catch (error) {
    logger.error('SYSTEM', `Lỗi khi cố gắng thêm người dùng mới "${user.username}": ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function updateOne(user: IUser): Promise<IUserPublic> {
  try {
    const updated = await UserRepo.update(user);
    
    logger.info('SYSTEM', `Cập nhật thông tin thành công cho tài khoản "${updated.username}" (ID: ${user.id}).`);
    return updated;
  } catch (error) {
    if (error instanceof Error && error.message === 'User not found') {
      logger.warn('SYSTEM', `Cập nhật thất bại: Người dùng có ID [${user.id}] không tồn tại trên hệ thống.`);
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
    }

    if (!(error instanceof RouteError)) {
      logger.error('SYSTEM', `Lỗi hệ thống khi cập nhật người dùng có ID [${user.id}]: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

async function updatePassword(userId: number, passwordInput: string): Promise<void> {
  try {
    await UserRepo.update({ 
      id: userId, 
      password: passwordInput 
    });

    logger.info('SYSTEM', `Cập nhật mật khẩu thành công cho người dùng có ID: ${userId}.`);
  } catch (error) {

    if (error instanceof Error && error.message === 'User not found') {
      logger.warn('SYSTEM', `Cập nhật mật khẩu thất bại: Người dùng có ID [${userId}] không tồn tại.`);
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
    }
    
    if (!(error instanceof RouteError)) {
      logger.error('SYSTEM', `Lỗi hệ thống khi cập nhật mật khẩu cho người dùng có ID [${userId}]: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

async function deleteOne(id: number): Promise<void> {
  try {
    const exists = await UserRepo.persists(id);
    if (!exists) {
      logger.warn('SYSTEM', `Xóa thất bại: Người dùng có ID [${id}] không tồn tại trên hệ thống.`);
      throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
    }
    await UserRepo.delete(id);
    logger.info('SYSTEM', `Xóa thành công tài khoản người dùng có ID [${id}] khỏi hệ thống.`);
  } catch (error) {
    if (!(error instanceof RouteError)) {
      logger.error('SYSTEM', `Lỗi hệ thống khi xóa người dùng có ID [${id}]: ${error instanceof Error ? error.message : String(error)}`);
    }
    throw error;
  }
}

/******************************************************************************
                             Employee Statistics Services
******************************************************************************/

async function getEmployeeOverviewStats(userId: number) {
  const exists = await UserRepo.persists(userId);
  if (!exists) {
    logger.warn('SYSTEM', `Truy cập thống kê thất bại: User ID [${userId}] không tồn tại.`);
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  logger.info('SYSTEM', `Truy xuất báo cáo tổng quan hiệu suất KPI cho User ID [${userId}].`);
  return UserRepo.getEmployeeOverviewStats(userId);
}

async function getEmployeeMonthlyStats(userId: number, month?: number, year?: number) {
  const exists = await UserRepo.persists(userId);
  if (!exists) {
    logger.warn('SYSTEM', `Truy cập thống kê tháng thất bại: User ID [${userId}] không tồn tại.`);
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  logger.info('SYSTEM', `Truy xuất số liệu năng suất tháng ${month || 'hiện tại'}/${year || 'hiện tại'} của User ID [${userId}].`);
  return UserRepo.getEmployeeMonthlyStats(userId, month, year);
}

async function getEmployeeLocationStats(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  logger.info('SYSTEM', `Truy xuất thống kê phân bổ doanh thu địa bàn (Tỉnh: ${province || 'Tất cả'}, Xã/Phường: ${ward || 'Tất cả'}) vào tháng ${month}/${year}.`);
  return UserRepo.getEmployeeLocationStats(scope, month, year, province, ward, date);
}

async function getEmployeeTopProducts(userId: number) {
  const exists = await UserRepo.persists(userId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  logger.info('SYSTEM', `Truy xuất danh sách sản phẩm bán chạy nhất của User ID [${userId}].`);
  return UserRepo.getEmployeeTopProducts(userId);
}

async function getEmployeeStatusBreakdown(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  return UserRepo.getEmployeeStatusBreakdown(scope, month, year, province, ward, date);
}

async function getEmployeeRecentSalesTimeline(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  return UserRepo.getEmployeeRecentSalesTimeline(scope, month, year, province, ward, date);
}

async function getSellerOverviewStats(scope: SellerScope, month: string, year: string, province?: string, ward?: string, date?: string) {
  return UserRepo.getSellerOverviewStats(scope, month, year, province, ward, date);
}

async function getSellerRevenueSeries(
  scope: SellerScope,
  year: string,
  month: string,
  province?: string,
  ward?: string,
) {
  return UserRepo.getSellerRevenueSeries(scope, year, month, province, ward);
}

async function getSellerMonthlyStats(sellerId: number, month?: number, year?: number) {
  const exists = await UserRepo.persists(sellerId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  return UserRepo.getSellerMonthlyStats(sellerId, month, year);
}

async function getEmployeeTopDebtors(scope: SellerScope, province?: string, ward?: string) {
  return UserRepo.getEmployeeTopDebtors(scope, province, ward);
}

async function getShipperOverviewStats(shipperId: number, month?: string, year?: string, date?: string) {
  const exists = await UserRepo.persists(shipperId);
  if (!exists) {
    logger.warn('SYSTEM', `Truy cập thống kê shipper thất bại: Shipper ID [${shipperId}] không tồn tại.`);
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  logger.info('SYSTEM', `Truy xuất tổng quan chuyến giao hàng và tiền COD của Shipper ID [${shipperId}].`);
  return UserRepo.getShipperOverviewStats(shipperId, month, year, date);
}

async function getShipperMonthlyStats(shipperId: number, month?: number, year?: number, date?: string) {
  const exists = await UserRepo.persists(shipperId);
  if (!exists) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, Errors.USER_NOT_FOUND);
  }
  return UserRepo.getShipperMonthlyStats(shipperId, month, year, date);
}

async function getMapStatusByActivities(dateString: string) {
  if (!dateString || isNaN(Date.parse(dateString))) {
    logger.warn('SYSTEM', `Yêu cầu kiểm tra sơ đồ địa bàn thất bại: Chuỗi ngày gửi lên không hợp lệ ("${dateString}").`);
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'A valid date string (YYYY-MM-DD) is required.');
  }
  
  logger.info('SYSTEM', `Đang kết nối API bóc tách dữ liệu và kiểm tra bám chốt địa bàn cho ngày lịch trình: ${dateString}.`);
  return UserRepo.getMapStatusByActivities(dateString);
}

/******************************************************************************
                                    Export default
******************************************************************************/

export default {
  Errors,
  getOne,
  getAll,
  getAllUnactivated,
  search,
  addOne,
  updateOne,
  updatePassword,
  delete: deleteOne,
  getEmployeeOverviewStats,
  getEmployeeMonthlyStats,
  getEmployeeLocationStats,
  getEmployeeTopProducts,
  getEmployeeStatusBreakdown,
  getEmployeeRecentSalesTimeline,
  getSellerOverviewStats,
  getSellerRevenueSeries,
  getSellerMonthlyStats,
  getEmployeeTopDebtors,
  getShipperOverviewStats,
  getShipperMonthlyStats,
  getMapStatusByActivities
} as const;