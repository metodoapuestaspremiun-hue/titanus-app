const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const titanus = await prisma.tenant.findUnique({
    where: { slug: 'titanus-gym' },
    include: { branches: true }
  });

  console.log('Titanus ID:', titanus?.id);
  console.log('Branches:', titanus?.branches);

  const mainBranch = titanus?.branches.find(b => b.isMain);
  if (!mainBranch) {
    console.error('No main branch found!');
    return;
  }

  // Assign any unassigned staff in Titanus to Centro (Matriz)
  const updatedStaff = await prisma.staff.updateMany({
    where: {
      tenantId: titanus.id,
      branchId: null
    },
    data: {
      branchId: mainBranch.id
    }
  });

  console.log('Updated staff without branch to Centro:', updatedStaff.count);

  // List staff per branch
  for (const branch of titanus.branches) {
    const count = await prisma.staff.count({
      where: {
        tenantId: titanus.id,
        branchId: branch.id
      }
    });
    const staffList = await prisma.staff.findMany({
      where: {
        tenantId: titanus.id,
        branchId: branch.id
      },
      select: { name: true }
    });
    console.log(`Branch ${branch.name} (${branch.code}): ${count} coaches -> [${staffList.map(s => s.name).join(', ')}]`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

