import prisma from "./prisma";


async function saveToken(userId: number, token: string, expiresAt: Date) {
  await deleteUserTokens(userId); 
  
  return await prisma.refreshToken.create({
    data: { user_id:userId, token:token, expires_at:expiresAt },
  });
}

async function findToken(token: string) {
  return await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
}

async function deleteToken(token: string) {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });
}

async function deleteUserTokens(userId: number) {
  return await prisma.refreshToken.deleteMany({
    where: { user_id:userId },
  });
}

export default {
  saveToken,
  findToken,
  deleteToken,
  deleteUserTokens,
} as const;