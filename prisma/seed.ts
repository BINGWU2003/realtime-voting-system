import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 清理现有数据
  await prisma.vote.deleteMany()
  await prisma.option.deleteMany()
  await prisma.poll.deleteMany()

  // 创建投票问卷
  const poll = await prisma.poll.create({
    data: {
      title: '您最喜欢的编程语言是？',
      description: '请选择您最喜欢的编程语言',
      options: {
        create: [
          { text: 'JavaScript' },
          { text: 'Python' },
          { text: 'Java' },
          { text: 'TypeScript' },
          { text: 'Go' }
        ]
      }
    }
  })

  console.log('种子数据创建成功:', poll)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 