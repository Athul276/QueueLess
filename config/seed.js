const User = require('../models/User');
const Service = require('../models/Service');
const Counter = require('../models/Counter');
const Token = require('../models/Token');

const seedData = async () => {
  try {
    const userCount = await User.countDocuments();
    let admin, userAthul, userPriya, userRahul;

    if (userCount === 0) {
      console.log('🌱 Seeding initial QueueLess users...');

      // 1. Create Admin & Demo User
      admin = await User.create({
        name: 'System Admin',
        email: 'admin@queueless.com',
        password: 'admin123',
        role: 'admin',
        officeAccessCode: 'MACE-OFFICE-2026',
      });

      userAthul = await User.create({
        name: 'Athul',
        email: 'athul@example.com',
        password: 'user123',
        role: 'user',
      });

      userPriya = await User.create({
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'user123',
        role: 'user',
      });

      userRahul = await User.create({
        name: 'Rahul Nair',
        email: 'rahul@example.com',
        password: 'user123',
        role: 'user',
      });
    } else {
      admin = await User.findOne({ role: 'admin' });
      userAthul = await User.findOne({ email: 'athul@example.com' }) || admin;
      userPriya = await User.findOne({ email: 'priya@example.com' }) || admin;
      userRahul = await User.findOne({ email: 'rahul@example.com' }) || admin;
    }

    // 2. Ensure Default Services with College Access Keys exist
    const defaultServices = [
      {
        serviceName: 'College Office',
        code: 'A',
        description: 'Fee collection, document submissions & hall ticket inquiries',
        avgServiceTimeMinutes: 5,
        status: 'ACTIVE',
        accessCode: 'MACE-OFFICE',
        requireAccessCode: true,
      },
      {
        serviceName: 'Laboratory',
        code: 'B',
        description: 'Equipment allocation, project evaluations & lab clearances',
        avgServiceTimeMinutes: 8,
        status: 'ACTIVE',
        accessCode: 'MACE-LAB',
        requireAccessCode: true,
      },
      {
        serviceName: 'Clinic',
        code: 'C',
        description: 'Health consultations, first-aid & medical leave endorsements',
        avgServiceTimeMinutes: 7,
        status: 'ACTIVE',
        accessCode: 'MACE-CLINIC',
        requireAccessCode: true,
      },
      {
        serviceName: 'Certificate Section',
        code: 'D',
        description: 'Transcript issuance, bonafide & migration certificates',
        avgServiceTimeMinutes: 6,
        status: 'ACTIVE',
        accessCode: 'MACE-CERT',
        requireAccessCode: true,
      },
    ];

    for (const def of defaultServices) {
      const exists = await Service.findOne({ $or: [{ code: def.code }, { serviceName: def.serviceName }] });
      if (!exists) {
        await Service.create(def);
      }
    }

    const allCurrentServices = await Service.find({ status: 'ACTIVE' });

    // 3. Ensure Default Counters exist and are assigned to valid services
    const counterNames = ['Counter 1', 'Counter 2', 'Counter 3', 'Counter 4'];
    let counter1 = null, counter2 = null;

    for (let i = 0; i < counterNames.length; i++) {
      const name = counterNames[i];
      let cnt = await Counter.findOne({ counterName: name });
      const targetSvc = allCurrentServices[i % allCurrentServices.length];

      if (!cnt) {
        cnt = await Counter.create({
          counterName: name,
          service: targetSvc ? targetSvc._id : null,
          status: 'ACTIVE',
        });
      } else {
        const svcExists = cnt.service ? await Service.findById(cnt.service) : null;
        if (!svcExists && targetSvc) {
          cnt.service = targetSvc._id;
          if (cnt.status === 'INACTIVE') cnt.status = 'ACTIVE';
          await cnt.save();
        }
      }

      if (name === 'Counter 1') counter1 = cnt;
      if (name === 'Counter 2') counter2 = cnt;
    }

    const serviceOffice = await Service.findOne({ code: 'A' }) || allCurrentServices[0];
    const serviceLab = await Service.findOne({ code: 'B' }) || allCurrentServices[1] || serviceOffice;

    // 4. Create Initial Tokens if none exist
    const tokenCount = await Token.countDocuments();
    if (tokenCount === 0 && userAthul && serviceOffice && counter1) {
      // Completed history tokens
      await Token.create({
        tokenNumber: 'A015',
        sequenceNumber: 15,
        user: userAthul._id,
        service: serviceOffice._id,
        counter: counter1._id,
        status: 'COMPLETED',
        calledAt: new Date(Date.now() - 45 * 60 * 1000),
        completedAt: new Date(Date.now() - 40 * 60 * 1000),
      });

      if (counter2 && serviceLab) {
        await Token.create({
          tokenNumber: 'B008',
          sequenceNumber: 8,
          user: userPriya._id,
          service: serviceLab._id,
          counter: counter2._id,
          status: 'COMPLETED',
          calledAt: new Date(Date.now() - 30 * 60 * 1000),
          completedAt: new Date(Date.now() - 22 * 60 * 1000),
        });
      }

      // Now Serving Token
      const servingToken = await Token.create({
        tokenNumber: 'A021',
        sequenceNumber: 21,
        user: userPriya._id,
        service: serviceOffice._id,
        counter: counter1._id,
        status: 'CALLED',
        calledAt: new Date(Date.now() - 3 * 60 * 1000),
      });

      counter1.currentServingToken = servingToken._id;
      counter1.status = 'BUSY';
      await counter1.save();

      // Waiting queue
      await Token.create({
        tokenNumber: 'A022',
        sequenceNumber: 22,
        user: userRahul._id,
        service: serviceOffice._id,
        status: 'WAITING',
        estimatedWaitMinutes: 5,
      });

      await Token.create({
        tokenNumber: 'A023',
        sequenceNumber: 23,
        user: userPriya._id,
        service: serviceOffice._id,
        status: 'WAITING',
        estimatedWaitMinutes: 10,
      });

      await Token.create({
        tokenNumber: 'A024',
        sequenceNumber: 24,
        user: admin._id,
        service: serviceOffice._id,
        status: 'WAITING',
        estimatedWaitMinutes: 15,
      });
    }

    console.log('✅ Demo Seed Data Loaded Successfully!');
    console.log('   Admin: admin@queueless.com / admin123');
    console.log('   User:  athul@example.com / user123');
  } catch (error) {
    console.error('Seed data error:', error);
  }
};

module.exports = seedData;
