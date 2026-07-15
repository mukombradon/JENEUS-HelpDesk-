import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // --------------------------------------------------------------------------
  // Hash password once for all demo users
  // --------------------------------------------------------------------------
  const passwordHash = bcrypt.hashSync('password123', 10);

  // --------------------------------------------------------------------------
  // 1. Create Teams (without leads first — leads are assigned after user creation)
  // --------------------------------------------------------------------------
  const teamNetwork = await prisma.team.create({
    data: {
      name: 'Network Infrastructure',
      description: 'Handles network infrastructure, connectivity, and hardware issues.',
    },
  });

  const teamSoftware = await prisma.team.create({
    data: {
      name: 'Software Support',
      description: 'Handles software applications, licensing, and feature requests.',
    },
  });

  const teamSecurity = await prisma.team.create({
    data: {
      name: 'Security & Access',
      description: 'Handles access control, authentication, and security incidents.',
    },
  });

  console.log('Teams created:', teamNetwork.name, teamSoftware.name, teamSecurity.name);

  // --------------------------------------------------------------------------
  // 2. Create Users
  // --------------------------------------------------------------------------
  // Super admin — no team
  const alexSuper = await prisma.user.create({
    data: {
      firstName: 'Alex',
      lastName: 'Super',
      email: 'alex@jeneusco.com',
      passwordHash,
      role: 'super_admin',
      isActive: true,
    },
  });

  // Admin — no team
  const brookeAdmin = await prisma.user.create({
    data: {
      firstName: 'Brooke',
      lastName: 'Admin',
      email: 'brooke@jeneusco.com',
      passwordHash,
      role: 'admin',
      isActive: true,
    },
  });

  // Team leads
  const charlieLead = await prisma.user.create({
    data: {
      firstName: 'Charlie',
      lastName: 'Lead',
      email: 'charlie@jeneusco.com',
      passwordHash,
      role: 'team_lead',
      teamId: teamNetwork.id,
      isActive: true,
    },
  });

  const danaLead = await prisma.user.create({
    data: {
      firstName: 'Dana',
      lastName: 'Lead',
      email: 'dana@jeneusco.com',
      passwordHash,
      role: 'team_lead',
      teamId: teamSoftware.id,
      isActive: true,
    },
  });

  const evanLead = await prisma.user.create({
    data: {
      firstName: 'Evan',
      lastName: 'Lead',
      email: 'evan@jeneusco.com',
      passwordHash,
      role: 'team_lead',
      teamId: teamSecurity.id,
      isActive: true,
    },
  });

  // Agents
  const frankAgent = await prisma.user.create({
    data: {
      firstName: 'Frank',
      lastName: 'Agent',
      email: 'frank@jeneusco.com',
      passwordHash,
      role: 'agent',
      teamId: teamNetwork.id,
      isActive: true,
    },
  });

  const graceAgent = await prisma.user.create({
    data: {
      firstName: 'Grace',
      lastName: 'Agent',
      email: 'grace@jeneusco.com',
      passwordHash,
      role: 'agent',
      teamId: teamSoftware.id,
      isActive: true,
    },
  });

  const hankAgent = await prisma.user.create({
    data: {
      firstName: 'Hank',
      lastName: 'Agent',
      email: 'hank@jeneusco.com',
      passwordHash,
      role: 'agent',
      teamId: teamSecurity.id,
      isActive: true,
    },
  });

  const ivyAgent = await prisma.user.create({
    data: {
      firstName: 'Ivy',
      lastName: 'Agent',
      email: 'ivy@jeneusco.com',
      passwordHash,
      role: 'agent',
      teamId: teamSoftware.id,
      isActive: true,
    },
  });

  const jackAgent = await prisma.user.create({
    data: {
      firstName: 'Jack',
      lastName: 'Agent',
      email: 'jack@jeneusco.com',
      passwordHash,
      role: 'agent',
      teamId: teamNetwork.id,
      isActive: true,
    },
  });

  console.log('Users created (10 total)');

  // --------------------------------------------------------------------------
  // 3. Assign Team Leads (update teams with leadId)
  // --------------------------------------------------------------------------
  await prisma.team.update({
    where: { id: teamNetwork.id },
    data: { leadId: charlieLead.id },
  });

  await prisma.team.update({
    where: { id: teamSoftware.id },
    data: { leadId: danaLead.id },
  });

  await prisma.team.update({
    where: { id: teamSecurity.id },
    data: { leadId: evanLead.id },
  });

  console.log('Team leads assigned');

  // --------------------------------------------------------------------------
  // 4. Create SLA Policies
  // --------------------------------------------------------------------------
  const premiumSla = await prisma.sLAPolicy.create({
    data: {
      name: 'Premium SLA',
      description: 'Premium support with fast response and resolution times.',
      rules: [
        { priority: 'critical', response: '1h', resolution: '4h' },
        { priority: 'high', response: '2h', resolution: '8h' },
        { priority: 'medium', response: '4h', resolution: '24h' },
        { priority: 'low', response: '8h', resolution: '48h' },
      ],
      businessHoursOnly: false,
    },
  });

  const standardSla = await prisma.sLAPolicy.create({
    data: {
      name: 'Standard SLA',
      description: 'Standard support during business hours.',
      rules: [
        { priority: 'critical', response: '4h', resolution: '24h' },
        { priority: 'high', response: '8h', resolution: '48h' },
        { priority: 'medium', response: '24h', resolution: '72h' },
        { priority: 'low', response: '48h', resolution: '120h' },
      ],
      businessHoursOnly: true,
      businessHours: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
      },
    },
  });

  console.log('SLA policies created:', premiumSla.name, standardSla.name);

  // --------------------------------------------------------------------------
  // 5. Create Clients with Contacts
  // --------------------------------------------------------------------------

  // --- Acme Corp ---
  const acmeContact1 = await prisma.clientContact.create({
    data: {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acmecorp.com',
      phone: '+1-555-0101',
      role: 'IT Director',
      isPrimary: true,
      portalAccess: true,
    },
  });

  const acmeContact2 = await prisma.clientContact.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Jones',
      email: 'sarah.jones@acmecorp.com',
      phone: '+1-555-0102',
      role: 'Support Manager',
      isPrimary: false,
      portalAccess: true,
    },
  });

  const acmeCorp = await prisma.client.create({
    data: {
      name: 'Acme Corp',
      industry: 'technology',
      contractTier: 'premium',
      slaPolicyId: premiumSla.id,
      primaryContactId: acmeContact1.id,
      accountManagerId: alexSuper.id,
      isActive: true,
    },
  });

  // Update contacts with clientId
  await prisma.clientContact.update({
    where: { id: acmeContact1.id },
    data: { clientId: acmeCorp.id },
  });
  await prisma.clientContact.update({
    where: { id: acmeContact2.id },
    data: { clientId: acmeCorp.id },
  });

  // --- Globex Inc ---
  const globexContact1 = await prisma.clientContact.create({
    data: {
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'bob.williams@globexinc.com',
      phone: '+1-555-0201',
      role: 'Operations Lead',
      isPrimary: true,
      portalAccess: true,
    },
  });

  const globexContact2 = await prisma.clientContact.create({
    data: {
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@globexinc.com',
      phone: '+1-555-0202',
      role: 'IT Coordinator',
      isPrimary: false,
      portalAccess: true,
    },
  });

  const globexContact3 = await prisma.clientContact.create({
    data: {
      firstName: 'Tom',
      lastName: 'Davis',
      email: 'tom.davis@globexinc.com',
      phone: '+1-555-0203',
      role: 'Helpdesk Analyst',
      isPrimary: false,
      portalAccess: false,
    },
  });

  const globexInc = await prisma.client.create({
    data: {
      name: 'Globex Inc',
      industry: 'manufacturing',
      contractTier: 'standard',
      slaPolicyId: standardSla.id,
      primaryContactId: globexContact1.id,
      accountManagerId: brookeAdmin.id,
      isActive: true,
    },
  });

  await prisma.clientContact.update({
    where: { id: globexContact1.id },
    data: { clientId: globexInc.id },
  });
  await prisma.clientContact.update({
    where: { id: globexContact2.id },
    data: { clientId: globexInc.id },
  });
  await prisma.clientContact.update({
    where: { id: globexContact3.id },
    data: { clientId: globexInc.id },
  });

  // --- Initech ---
  const initechContact1 = await prisma.clientContact.create({
    data: {
      firstName: 'Mike',
      lastName: 'Wilson',
      email: 'mike.wilson@initech.com',
      phone: '+1-555-0301',
      role: 'CTO',
      isPrimary: true,
      portalAccess: true,
    },
  });

  const initechContact2 = await prisma.clientContact.create({
    data: {
      firstName: 'Lisa',
      lastName: 'Anderson',
      email: 'lisa.anderson@initech.com',
      phone: '+1-555-0302',
      role: 'Systems Administrator',
      isPrimary: false,
      portalAccess: true,
    },
  });

  const initech = await prisma.client.create({
    data: {
      name: 'Initech',
      industry: 'finance',
      contractTier: 'enterprise',
      slaPolicyId: premiumSla.id,
      primaryContactId: initechContact1.id,
      accountManagerId: charlieLead.id,
      isActive: true,
    },
  });

  await prisma.clientContact.update({
    where: { id: initechContact1.id },
    data: { clientId: initech.id },
  });
  await prisma.clientContact.update({
    where: { id: initechContact2.id },
    data: { clientId: initech.id },
  });

  console.log('Clients created:', acmeCorp.name, globexInc.name, initech.name);

  // --------------------------------------------------------------------------
  // 6. Create Categories with Subcategories
  // --------------------------------------------------------------------------
  const catNetwork = await prisma.category.create({
    data: { name: 'Network', icon: 'Globe', defaultTeamId: teamNetwork.id },
  });
  const catSoftware = await prisma.category.create({
    data: { name: 'Software', icon: 'Code', defaultTeamId: teamSoftware.id },
  });
  const catHardware = await prisma.category.create({
    data: { name: 'Hardware', icon: 'Monitor', defaultTeamId: teamNetwork.id },
  });
  const catAccess = await prisma.category.create({
    data: { name: 'Access & Security', icon: 'ShieldLock', defaultTeamId: teamSecurity.id },
  });
  const catEmail = await prisma.category.create({
    data: { name: 'Email', icon: 'Mail', defaultTeamId: teamSoftware.id },
  });
  const catDatabase = await prisma.category.create({
    data: { name: 'Database', icon: 'Database', defaultTeamId: teamSoftware.id },
  });

  // Subcategories for Network
  const subVpnIssue = await prisma.subcategory.create({ data: { categoryId: catNetwork.id, name: 'VPN Issue' } });
  const subDnsProblem = await prisma.subcategory.create({ data: { categoryId: catNetwork.id, name: 'DNS Problem' } });
  const subConnectivityLoss = await prisma.subcategory.create({ data: { categoryId: catNetwork.id, name: 'Connectivity Loss' } });
  const subBandwidthSlow = await prisma.subcategory.create({ data: { categoryId: catNetwork.id, name: 'Bandwidth Slow' } });

  // Subcategories for Software
  const subBugReport = await prisma.subcategory.create({ data: { categoryId: catSoftware.id, name: 'Bug Report' } });
  const subFeatureRequest = await prisma.subcategory.create({ data: { categoryId: catSoftware.id, name: 'Feature Request' } });
  const subInstallationIssue = await prisma.subcategory.create({ data: { categoryId: catSoftware.id, name: 'Installation Issue' } });
  const subLicenseActivation = await prisma.subcategory.create({ data: { categoryId: catSoftware.id, name: 'License Activation' } });

  // Subcategories for Hardware
  const subPrinterFailure = await prisma.subcategory.create({ data: { categoryId: catHardware.id, name: 'Printer Failure' } });
  const subComputerMalfunction = await prisma.subcategory.create({ data: { categoryId: catHardware.id, name: 'Computer Malfunction' } });
  const subPeripheralIssue = await prisma.subcategory.create({ data: { categoryId: catHardware.id, name: 'Peripheral Issue' } });

  // Subcategories for Access & Security
  const subPasswordReset = await prisma.subcategory.create({ data: { categoryId: catAccess.id, name: 'Password Reset' } });
  const subAccountLockout = await prisma.subcategory.create({ data: { categoryId: catAccess.id, name: 'Account Lockout' } });
  const subMfaIssue = await prisma.subcategory.create({ data: { categoryId: catAccess.id, name: 'MFA Issue' } });
  const subPermissionError = await prisma.subcategory.create({ data: { categoryId: catAccess.id, name: 'Permission Error' } });

  // Subcategories for Email
  const subDeliveryIssue = await prisma.subcategory.create({ data: { categoryId: catEmail.id, name: 'Delivery Issue' } });
  const subEmailConfig = await prisma.subcategory.create({ data: { categoryId: catEmail.id, name: 'Configuration' } });
  const subSpamFilter = await prisma.subcategory.create({ data: { categoryId: catEmail.id, name: 'Spam Filter' } });

  // Subcategories for Database
  const subQueryPerf = await prisma.subcategory.create({ data: { categoryId: catDatabase.id, name: 'Query Performance' } });
  const subDbConnection = await prisma.subcategory.create({ data: { categoryId: catDatabase.id, name: 'Connection Issue' } });
  const subBackupFailure = await prisma.subcategory.create({ data: { categoryId: catDatabase.id, name: 'Backup Failure' } });

  console.log('Categories and subcategories created (6 categories, 24 subcategories)');

  // --------------------------------------------------------------------------
  // 7. Create Tickets
  // Helper to calculate SLA deadlines
  // --------------------------------------------------------------------------
  const now = new Date();
  const hoursFromNow = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000);
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // --- Problem Ticket 1: PRB-00001 - Recurring VPN authentication failures ---
  const problem1 = await prisma.ticket.create({
    data: {
      ticketNumber: 'PRB-00001',
      type: 'problem',
      title: 'Recurring VPN authentication failures',
      description:
        'Multiple users across Acme Corp are experiencing intermittent VPN authentication failures during peak morning hours (8-10 AM). The issue appears to be related to RADIUS server timeouts under load. Investigating root cause and implementing a permanent fix.',
      status: 'in_progress',
      priority: 'critical',
      categoryId: catNetwork.id,
      subcategoryId: subVpnIssue.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: frankAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: charlieLead.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(1),
      resolutionDueAt: hoursFromNow(4),
      recurrenceCount: 5,
      tags: ['vpn', 'authentication', 'recurring'],
      source: 'portal',
    },
  });

  // Incident linked to Problem 1
  const incident1a = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00001',
      type: 'incident',
      title: 'Unable to connect to VPN from home office',
      description:
        'John Smith reports he cannot establish a VPN connection from his home office. Connection times out after 30 seconds. This is blocking access to the internal ERP system.',
      status: 'resolved',
      priority: 'high',
      categoryId: catNetwork.id,
      subcategoryId: subVpnIssue.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: frankAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: alexSuper.id,
      parentProblemId: problem1.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(2),
      resolutionDueAt: hoursFromNow(8),
      firstResponseAt: hoursAgo(23),
      resolvedAt: hoursAgo(20),
      tags: ['vpn'],
      source: 'portal',
      createdAt: daysAgo(1),
    },
  });

  const incident1b = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00002',
      type: 'incident',
      title: 'VPN authentication timeout after 2FA',
      description:
        'Sarah Jones successfully enters credentials and 2FA code but the VPN client hangs at "authenticating" for 2 minutes before timing out. Intermittent issue — works after 3-4 retries.',
      status: 'resolved',
      priority: 'high',
      categoryId: catNetwork.id,
      subcategoryId: subVpnIssue.id,
      clientId: acmeCorp.id,
      contactId: acmeContact2.id,
      assignedAgentId: frankAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: alexSuper.id,
      parentProblemId: problem1.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(2),
      resolutionDueAt: hoursFromNow(8),
      firstResponseAt: hoursAgo(47),
      resolvedAt: hoursAgo(44),
      tags: ['vpn', '2fa'],
      source: 'portal',
      createdAt: daysAgo(2),
    },
  });

  const incident1c = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00003',
      type: 'incident',
      title: 'Intermittent VPN disconnects during meetings',
      description:
        'Multiple Acme Corp users report their VPN drops connection randomly during Teams meetings. Reconnection takes 1-2 minutes. Particularly bad between 9-10 AM.',
      status: 'open',
      priority: 'medium',
      categoryId: catNetwork.id,
      subcategoryId: subConnectivityLoss.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: jackAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: alexSuper.id,
      parentProblemId: problem1.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(4),
      resolutionDueAt: hoursFromNow(24),
      tags: ['vpn', 'connectivity'],
      source: 'portal',
      createdAt: hoursAgo(2),
    },
  });

  // --- Problem Ticket 2: PRB-00002 - Email delivery delays on Globex domain ---
  const problem2 = await prisma.ticket.create({
    data: {
      ticketNumber: 'PRB-00002',
      type: 'problem',
      title: 'Email delivery delays on Globex domain',
      description:
        'Emails sent to and from @globexinc.com are experiencing 15-30 minute delivery delays. Preliminary investigation points to an SPF/DKIM misconfiguration after the recent DNS migration. Working on a permanent fix.',
      status: 'in_progress',
      priority: 'high',
      categoryId: catEmail.id,
      subcategoryId: subDeliveryIssue.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: graceAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: danaLead.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(8),
      resolutionDueAt: hoursFromNow(48),
      recurrenceCount: 3,
      tags: ['email', 'globex', 'delivery'],
      source: 'email',
    },
  });

  const incident2a = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00004',
      type: 'incident',
      title: 'Email not sending from Outlook to external domains',
      description:
        'Bob Williams reports that emails sent from Outlook to @gmail.com addresses are stuck in Outbox for 20+ minutes before sending. Internal emails within @globexinc.com work fine.',
      status: 'resolved',
      priority: 'high',
      categoryId: catEmail.id,
      subcategoryId: subDeliveryIssue.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: graceAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: brookeAdmin.id,
      parentProblemId: problem2.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(8),
      resolutionDueAt: hoursFromNow(48),
      firstResponseAt: hoursAgo(12),
      resolvedAt: hoursAgo(6),
      tags: ['email', 'outlook', 'globex'],
      source: 'portal',
      createdAt: daysAgo(1),
    },
  });

  const incident2b = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00005',
      type: 'incident',
      title: 'Incoming emails from partners being delayed',
      description:
        'Alice Brown reports that emails from key partners are arriving 15-30 minutes late. Time-sensitive order confirmations are affected. Partner domains are not in any blocklists.',
      status: 'open',
      priority: 'medium',
      categoryId: catEmail.id,
      subcategoryId: subDeliveryIssue.id,
      clientId: globexInc.id,
      contactId: globexContact2.id,
      assignedAgentId: ivyAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: brookeAdmin.id,
      parentProblemId: problem2.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(24),
      resolutionDueAt: hoursFromNow(72),
      tags: ['email', 'globex'],
      source: 'email',
      createdAt: hoursAgo(6),
    },
  });

  // --- Open incident for Acme Corp - Hardware ---
  const incPrinter = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00006',
      type: 'incident',
      title: 'Printer not responding on floor 3',
      description:
        'The HP LaserJet on floor 3 (building A) shows "offline" status in the print queue. Power cycling the device did not resolve the issue. Network connectivity to the printer IP is confirmed working.',
      status: 'open',
      priority: 'medium',
      categoryId: catHardware.id,
      subcategoryId: subPrinterFailure.id,
      clientId: acmeCorp.id,
      contactId: acmeContact2.id,
      assignedAgentId: jackAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: alexSuper.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(4),
      resolutionDueAt: hoursFromNow(24),
      tags: ['printer', 'hardware'],
      source: 'phone',
      createdAt: hoursAgo(1),
    },
  });

  // --- In-progress incident for Globex - Access ---
  const incAccountLockout = await prisma.ticket.create({
    data: {
    data: {
      ticketNumber: 'INC-00007',
      type: 'incident',
      title: 'User account locked after multiple failed login attempts',
      description:
        'Tom Davis reports his account was locked after what appears to be a brute force attempt. He needs his account unlocked and a security review of the login attempts.',
      status: 'in_progress',
      priority: 'high',
      categoryId: catAccess.id,
      subcategoryId: subAccountLockout.id,
      clientId: globexInc.id,
      contactId: globexContact3.id,
      assignedAgentId: hankAgent.id,
      assignedTeamId: teamSecurity.id,
      createdBy: brookeAdmin.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(8),
      resolutionDueAt: hoursFromNow(48),
      tags: ['security', 'lockout'],
      source: 'portal',
      createdAt: hoursAgo(3),
    },
  });

  // --- Open incident for Initech - Database ---
  const incDbPerf = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00008',
      type: 'incident',
      title: 'Slow database queries in financial reporting module',
      description:
        'Mike Wilson reports that the financial reporting module is timing out when generating monthly reports. Queries that used to take 30 seconds are now taking 5+ minutes. The database server CPU is pegged at 95%.',
      status: 'open',
      priority: 'critical',
      categoryId: catDatabase.id,
      subcategoryId: subQueryPerf.id,
      clientId: initech.id,
      contactId: initechContact1.id,
      assignedAgentId: ivyAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: charlieLead.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(1),
      resolutionDueAt: hoursFromNow(4),
      tags: ['database', 'performance', 'finance'],
      source: 'portal',
      createdAt: hoursAgo(0.5),
    },
  });

  // --- Pending (waiting client) for Initech - Access ---
  const incMfa = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00009',
      type: 'incident',
      title: 'MFA app not receiving push notifications',
      description:
        'Lisa Anderson is not receiving MFA push notifications on her Microsoft Authenticator app. Time-based codes work but pushes timeout. Device is an iPhone 15 on iOS 18. Requesting guidance on troubleshooting steps.',
      status: 'pending',
      priority: 'medium',
      categoryId: catAccess.id,
      subcategoryId: subMfaIssue.id,
      clientId: initech.id,
      contactId: initechContact2.id,
      assignedAgentId: hankAgent.id,
      assignedTeamId: teamSecurity.id,
      createdBy: charlieLead.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(4),
      resolutionDueAt: hoursFromNow(24),
      tags: ['mfa', 'authentication'],
      source: 'portal',
      createdAt: hoursAgo(10),
    },
  });

  // --- Open incident for Acme Corp - Software ---
  const incLicense = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00010',
      type: 'incident',
      title: 'Software license activation failed for new employee',
      description:
        'New employee Jane Doe cannot activate her Microsoft 365 license. The product key returns "already in use" error. Employee started yesterday and needs access urgently.',
      status: 'open',
      priority: 'high',
      categoryId: catSoftware.id,
      subcategoryId: subLicenseActivation.id,
      clientId: acmeCorp.id,
      contactId: acmeContact2.id,
      assignedAgentId: graceAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: alexSuper.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(2),
      resolutionDueAt: hoursFromNow(8),
      tags: ['license', 'microsoft'],
      source: 'portal',
      createdAt: hoursAgo(4),
    },
  });

  // --- Resolved incident for Globex - Network ---
  const incDns = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00011',
      type: 'incident',
      title: 'DNS resolution failures for internal resources',
      description:
        'Internal websites hosted on the intranet are intermittently returning DNS errors. External sites work fine. Issue started after the DNS server was patched last night.',
      status: 'resolved',
      priority: 'high',
      categoryId: catNetwork.id,
      subcategoryId: subDnsProblem.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: frankAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: brookeAdmin.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(8),
      resolutionDueAt: hoursFromNow(48),
      firstResponseAt: hoursAgo(20),
      resolvedAt: hoursAgo(12),
      tags: ['dns', 'internal'],
      source: 'portal',
      createdAt: daysAgo(1),
    },
  });

  // --- Closed incident for Acme Corp - Network ---
  const incBandwidth = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00012',
      type: 'incident',
      title: 'Bandwidth slow during afternoon peak hours',
      description:
        'Internet speeds drop to below 10 Mbps between 2-4 PM daily. Affecting all users in the main office. Plant floor operations are impacted as they rely on cloud-based tools.',
      status: 'closed',
      priority: 'medium',
      categoryId: catNetwork.id,
      subcategoryId: subBandwidthSlow.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: frankAgent.id,
      assignedTeamId: teamNetwork.id,
      createdBy: alexSuper.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(4),
      resolutionDueAt: hoursFromNow(24),
      firstResponseAt: daysAgo(5),
      resolvedAt: daysAgo(3),
      closedAt: daysAgo(2),
      tags: ['bandwidth', 'network'],
      source: 'phone',
      createdAt: daysAgo(6),
    },
  });

  // --- Open incident for Globex - Software ---
  const incBug = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00013',
      type: 'incident',
      title: 'Inventory management app crashes when exporting to PDF',
      description:
        'The inventory management application crashes with an unhandled exception whenever a user attempts to export inventory data as PDF. CSV export works fine. Error log shows a null reference in the PDF rendering module.',
      status: 'open',
      priority: 'medium',
      categoryId: catSoftware.id,
      subcategoryId: subBugReport.id,
      clientId: globexInc.id,
      contactId: globexContact2.id,
      assignedAgentId: graceAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: brookeAdmin.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(24),
      resolutionDueAt: hoursFromNow(72),
      tags: ['bug', 'inventory', 'crash'],
      source: 'portal',
      createdAt: hoursAgo(8),
    },
  });

  // --- Open incident for Initech - Access ---
  const incPermission = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00014',
      type: 'incident',
      title: 'Permission denied accessing shared financial drive',
      description:
        'Several users in the finance department are receiving "access denied" errors when trying to access the shared financial data drive (\\fileserver\finance). Their AD group memberships appear correct. Permission re-sync needed.',
      status: 'open',
      priority: 'high',
      categoryId: catAccess.id,
      subcategoryId: subPermissionError.id,
      clientId: initech.id,
      contactId: initechContact1.id,
      assignedAgentId: hankAgent.id,
      assignedTeamId: teamSecurity.id,
      createdBy: charlieLead.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(2),
      resolutionDueAt: hoursFromNow(8),
      tags: ['permissions', 'fileshare', 'finance'],
      source: 'portal',
      createdAt: hoursAgo(1),
    },
  });

  // --- Resolved incident for Acme Corp - Software ---
  const incInstall = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00015',
      type: 'incident',
      title: 'Installation error for AutoCAD 2025 on Windows 11',
      description:
        'Installation of AutoCAD 2025 fails with error code 1603 on a Windows 11 Pro workstation. The .NET framework prerequisites are installed and the system meets minimum requirements.',
      status: 'resolved',
      priority: 'low',
      categoryId: catSoftware.id,
      subcategoryId: subInstallationIssue.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: ivyAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: alexSuper.id,
      slaPolicyId: premiumSla.id,
      responseDueAt: hoursFromNow(8),
      resolutionDueAt: hoursFromNow(48),
      firstResponseAt: daysAgo(4),
      resolvedAt: daysAgo(3),
      tags: ['autocad', 'installation'],
      source: 'email',
      createdAt: daysAgo(5),
    },
  });

  // --- Pending (waiting client) for Globex - Email ---
  const incSpam = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00016',
      type: 'incident',
      title: 'Legitimate emails incorrectly flagged as spam',
      description:
        'Emails from several customer domains are being flagged as spam and sent to the junk folder. The senders are on approved domains list. SPF, DKIM, and DMARC records are configured correctly.',
      status: 'pending',
      priority: 'medium',
      categoryId: catEmail.id,
      subcategoryId: subSpamFilter.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: ivyAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: brookeAdmin.id,
      slaPolicyId: standardSla.id,
      responseDueAt: hoursFromNow(24),
      resolutionDueAt: hoursFromNow(72),
      tags: ['email', 'spam', 'globex'],
      source: 'email',
      createdAt: hoursAgo(16),
    },
  });

  // --- Soft-deleted cancelled ticket ---
  const incCancelled = await prisma.ticket.create({
    data: {
      ticketNumber: 'INC-00017',
      type: 'incident',
      title: 'Feature request: Dark mode for internal dashboard',
      description:
        'Request to add dark mode support to the internal company dashboard. This is a cosmetic enhancement and not urgent.',
      status: 'cancelled',
      priority: 'low',
      categoryId: catSoftware.id,
      subcategoryId: subFeatureRequest.id,
      clientId: initech.id,
      contactId: initechContact2.id,
      assignedAgentId: graceAgent.id,
      assignedTeamId: teamSoftware.id,
      createdBy: charlieLead.id,
      slaPolicyId: premiumSla.id,
      tags: ['feature-request', 'ui'],
      source: 'portal',
      deletedAt: daysAgo(1),
      createdAt: daysAgo(10),
    },
  });

  console.log('Tickets created (2 problems + 17 incidents = 19 tickets)');

  // --------------------------------------------------------------------------
  // 8. Create Comments and Activity Logs
  // --------------------------------------------------------------------------

  // Comments for incident1a (resolved VPN)
  await prisma.comment.create({
    data: {
      ticketId: incident1a.id,
      authorId: frankAgent.id,
      authorType: 'staff',
      body: 'I have checked the VPN logs. The connection is timing out at the RADIUS authentication step. Checking the RADIUS server status now.',
      isInternal: false,
      createdAt: hoursAgo(22),
    },
  });
  await prisma.comment.create({
    data: {
      ticketId: incident1a.id,
      authorId: frankAgent.id,
      authorType: 'staff',
      body: 'RADIUS server was overloaded. Restarted the service and the connection is working again. Need to investigate why the server was overloaded — linking to the parent problem ticket.',
      isInternal: true,
      createdAt: hoursAgo(21),
    },
  });
  await prisma.comment.create({
    data: {
      ticketId: incident1a.id,
      authorId: acmeContact1.id,
      authorType: 'client',
      body: 'Confirmed — I am able to connect to VPN again. Thank you for the quick response.',
      isInternal: false,
      createdAt: hoursAgo(20),
    },
  });

  // Comments for problem1
  await prisma.comment.create({
    data: {
      ticketId: problem1.id,
      authorId: charlieLead.id,
      authorType: 'staff',
      body: 'This is now our top priority. Frank, please coordinate with the network team to identify the root cause. I want a full RCA within 48 hours.',
      isInternal: true,
      createdAt: hoursAgo(24),
    },
  });
  await prisma.comment.create({
    data: {
      ticketId: problem1.id,
      authorId: frankAgent.id,
      authorType: 'staff',
      body: 'Initial analysis shows the RADIUS server reaches 95% CPU utilization between 8-10 AM. We need to either upgrade the server or implement load balancing. I recommend a second RADIUS instance.',
      isInternal: false,
      createdAt: hoursAgo(18),
    },
  });

  // Comments for incident7 (account lockout)
  await prisma.comment.create({
    data: {
      ticketId: incAccountLockout.id,
      authorId: hankAgent.id,
      authorType: 'staff',
      body: 'Account unlocked. I have reviewed the login attempts — 47 failed attempts from IP 185.220.101.x. The IP has been blocked at the firewall. Advise Tom to enable MFA if not already done.',
      isInternal: false,
      createdAt: hoursAgo(2),
    },
  });
  await prisma.comment.create({
    data: {
      ticketId: incAccountLockout.id,
      authorId: hankAgent.id,
      authorType: 'staff',
      body: 'This looks like a targeted attack. I recommend escalating to the security team for further investigation.',
      isInternal: true,
      createdAt: hoursAgo(2),
    },
  });

  // Comment for incident8 (database)
  await prisma.comment.create({
    data: {
      ticketId: incDbPerf.id,
      authorId: ivyAgent.id,
      authorType: 'staff',
      body: 'I am running an index analysis on the financial reporting tables. The monthly_report_summary table appears to be missing an index on the report_date column. Will update shortly.',
      isInternal: false,
      createdAt: hoursAgo(0.3),
    },
  });

  // Comment for incident9 (MFA)
  await prisma.comment.create({
    data: {
      ticketId: incMfa.id,
      authorId: hankAgent.id,
      authorType: 'staff',
      body: 'Lisa, could you please try re-registering the device in the MFA portal and let me know if push notifications start working? Instructions are attached.',
      isInternal: false,
      createdAt: hoursAgo(8),
    },
  });

  // Comments for the printer incident
  await prisma.comment.create({
    data: {
      ticketId: incPrinter.id,
      authorId: jackAgent.id,
      authorType: 'staff',
      body: 'I can see the printer on the network (192.168.3.50) but the print spooler is not responding. Will try restarting the spooler service remotely.',
      isInternal: false,
      createdAt: hoursAgo(0.5),
    },
  });

  // Activity Logs
  const activityEntries = [
    // Problem 1
    { ticketId: problem1.id, actorId: charlieLead.id, actorType: 'staff' as const, action: 'created', createdAt: daysAgo(3) },
    { ticketId: problem1.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'in_progress', createdAt: daysAgo(2) },
    { ticketId: problem1.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: frankAgent.id, createdAt: daysAgo(2) },

    // Incident 1a
    { ticketId: incident1a.id, actorId: acmeContact1.id, actorType: 'client' as const, action: 'created', createdAt: daysAgo(1) },
    { ticketId: incident1a.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: frankAgent.id, createdAt: hoursAgo(23) },
    { ticketId: incident1a.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'in_progress', createdAt: hoursAgo(22) },
    { ticketId: incident1a.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'in_progress', newValue: 'resolved', createdAt: hoursAgo(20) },

    // Incident 7 (account lockout)
    { ticketId: incAccountLockout.id, actorId: globexContact3.id, actorType: 'client' as const, action: 'created', createdAt: hoursAgo(3) },
    { ticketId: incAccountLockout.id, actorId: hankAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: hankAgent.id, createdAt: hoursAgo(2.5) },
    { ticketId: incAccountLockout.id, actorId: hankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'in_progress', createdAt: hoursAgo(2) },

    // Incident 8 (database)
    { ticketId: incDbPerf.id, actorId: initechContact1.id, actorType: 'client' as const, action: 'created', createdAt: hoursAgo(0.5) },

    // Incident 9 (MFA)
    { ticketId: incMfa.id, actorId: initechContact2.id, actorType: 'client' as const, action: 'created', createdAt: hoursAgo(10) },
    { ticketId: incMfa.id, actorId: hankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'pending', createdAt: hoursAgo(8) },

    // Incident 11 (DNS) — system created SLA breach warning
    { ticketId: incDns.id, actorId: 'system', actorType: 'system' as const, action: 'sla_warning', oldValue: null, newValue: 'Response due in 1 hour', createdAt: hoursAgo(21) },

    // Incident 12 (bandwidth)
    { ticketId: incBandwidth.id, actorId: acmeContact1.id, actorType: 'client' as const, action: 'created', createdAt: daysAgo(6) },
    { ticketId: incBandwidth.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: frankAgent.id, createdAt: daysAgo(5) },
    { ticketId: incBandwidth.id, actorId: frankAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'resolved', createdAt: daysAgo(3) },
    { ticketId: incBandwidth.id, actorId: charlieLead.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'resolved', newValue: 'closed', createdAt: daysAgo(2) },

    // Problem 2
    { ticketId: problem2.id, actorId: danaLead.id, actorType: 'staff' as const, action: 'created', createdAt: daysAgo(2) },
    { ticketId: problem2.id, actorId: graceAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: graceAgent.id, createdAt: daysAgo(2) },

    // Incident 2a
    { ticketId: incident2a.id, actorId: globexContact1.id, actorType: 'client' as const, action: 'created', createdAt: daysAgo(1) },
    { ticketId: incident2a.id, actorId: graceAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: graceAgent.id, createdAt: hoursAgo(14) },
    { ticketId: incident2a.id, actorId: graceAgent.id, actorType: 'staff' as const, action: 'status_changed', oldValue: 'open', newValue: 'resolved', createdAt: hoursAgo(6) },

    // Incident 2b
    { ticketId: incident2b.id, actorId: globexContact2.id, actorType: 'client' as const, action: 'created', createdAt: hoursAgo(6) },
    { ticketId: incident2b.id, actorId: ivyAgent.id, actorType: 'staff' as const, action: 'assigned', oldValue: null, newValue: ivyAgent.id, createdAt: hoursAgo(5) },
  ];

  for (const entry of activityEntries) {
    await prisma.activityLog.create({ data: entry });
  }

  console.log(`Activity logs created (${activityEntries.length} entries)`);

  // --------------------------------------------------------------------------
  // 9. Create Knowledge Base Articles
  // --------------------------------------------------------------------------

  const kbArticle1 = await prisma.knowledgeArticle.create({
    data: {
      title: "How to reset a user's password in Active Directory",
      body: `# How to Reset a User's Password in Active Directory

## Prerequisites
- Domain Admin or Account Operator privileges
- Remote Server Administration Tools (RSAT) installed, or direct access to a Domain Controller

## Steps

1. Open **Active Directory Users and Computers** (dsa.msc)
2. Navigate to the Organizational Unit (OU) containing the user account
3. Right-click the user account and select **Reset Password**
4. Enter the new password (must meet domain password policy requirements)
5. Check **User must change password at next logon** if required
6. Click OK to apply

## Using PowerShell
\`\`\`powershell
Set-ADAccountPassword -Identity "username" -Reset -NewPassword (ConvertTo-SecureString -AsPlainText "NewP@ssw0rd" -Force)
Set-ADUser -Identity "username" -ChangePasswordAtLogon $true
\`\`\`

## Troubleshooting
- Ensure the password meets complexity requirements
- Verify the account is not locked or disabled
- Check if fine-grained password policies apply`,
      categoryId: catAccess.id,
      tags: ['password', 'active-directory', 'reset'],
      viewCount: 245,
      helpfulCount: 38,
      notHelpfulCount: 3,
      isPublished: true,
      createdBy: evanLead.id,
      createdAt: daysAgo(60),
    },
  });

  const kbArticle2 = await prisma.knowledgeArticle.create({
    data: {
      title: 'VPN connection troubleshooting guide',
      body: `# VPN Connection Troubleshooting Guide

## Common Issues and Solutions

### 1. Connection Timeout
- Check if the VPN server is reachable: \`ping vpn.company.com\`
- Verify firewall rules allow UDP ports 500 and 4500
- Ensure the VPN client is up to date

### 2. Authentication Failures
- Verify credentials are correct (check caps lock)
- Ensure the user is not locked out in Active Directory
- Check RADIUS server status if using MFA

### 3. Connection Drops
- Check for network instability (packet loss, high latency)
- Verify the VPN timeout settings on the server
- Check for IP address conflicts

### 4. Split Tunneling Issues
- Verify routing table on client machine
- Check DNS suffix configuration
- Ensure corporate resources are accessible only through VPN tunnel

## Quick Tests
1. \`ping 10.0.0.1\` — Test internal network reachability
2. \`tracert 10.0.0.1\` — Trace route to identify where connection drops
3. \`nslookup internal-server.company.com\` — Test internal DNS resolution`,
      categoryId: catNetwork.id,
      tags: ['vpn', 'troubleshooting', 'network'],
      viewCount: 512,
      helpfulCount: 87,
      notHelpfulCount: 12,
      isPublished: true,
      createdBy: frankAgent.id,
      createdAt: daysAgo(45),
    },
  });

  const kbArticle3 = await prisma.knowledgeArticle.create({
    data: {
      title: 'Common email delivery issues and solutions',
      body: `# Common Email Delivery Issues and Solutions

## Issue 1: Emails Going to Spam
**Symptoms**: Legitimate emails are being flagged as spam

**Solutions**:
1. Check SPF record: \`nslookup -type=TXT domain.com\`
2. Verify DKIM signature is properly configured
3. Ensure DMARC policy is set correctly (start with p=none)
4. Check sender reputation using MXToolbox or similar
5. Verify the sending IP is not on any blocklists

## Issue 2: Email Delivery Delays
**Symptoms**: Emails take 15+ minutes to arrive

**Solutions**:
1. Check for DNS resolution issues
2. Verify MX records are correct
3. Review mail queue on the email server
4. Ensure there are no rate limiting issues
5. Check for anti-spam filtering delays

## Issue 3: Bounced Emails
**Symptoms**: Emails are returned with bounce messages

**Solutions**:
1. Verify recipient email address is valid
2. Check if the recipient's mailbox is full
3. Ensure the sending server is not blacklisted
4. Check message size limits`,
      categoryId: catEmail.id,
      tags: ['email', 'delivery', 'spf', 'dkim', 'dmarc'],
      viewCount: 178,
      helpfulCount: 29,
      notHelpfulCount: 4,
      isPublished: true,
      createdBy: graceAgent.id,
      createdAt: daysAgo(30),
    },
  });

  const kbArticle4 = await prisma.knowledgeArticle.create({
    data: {
      title: 'Network port mapping reference',
      body: `# Network Port Mapping Reference

## Common Service Ports

| Service | Protocol | Port |
|---------|----------|------|
| HTTP | TCP | 80 |
| HTTPS | TCP | 443 |
| SSH | TCP | 22 |
| RDP | TCP | 3389 |
| DNS | UDP/TCP | 53 |
| DHCP | UDP | 67/68 |
| SMTP | TCP | 25 |
| SMTPS | TCP | 587 |
| IMAP | TCP | 143 |
| IMAPS | TCP | 993 |
| POP3 | TCP | 110 |
| POP3S | TCP | 995 |
| LDAP | TCP/UDP | 389 |
| LDAPS | TCP | 636 |
| Kerberos | UDP/TCP | 88 |
| SMB | TCP | 445 |
| VPN (IPSec) | UDP | 500, 4500 |
| VPN (PPTP) | TCP | 1723 |
| SQL Server | TCP | 1433 |
| MySQL | TCP | 3306 |
| PostgreSQL | TCP | 5432 |
| MongoDB | TCP | 27017 |
| Redis | TCP | 6379 |

## Firewall Rule Naming Convention
\`[ACTION]-[DIRECTION]-[PROTOCOL]-[PORT]-[DESCRIPTION]\`
Example: \`ALLOW-IN-TCP-443-HTTPS_Traffic\`

Always document the business justification for firewall rules and review quarterly.`,
      categoryId: catNetwork.id,
      tags: ['network', 'ports', 'firewall', 'reference'],
      viewCount: 89,
      helpfulCount: 15,
      notHelpfulCount: 1,
      isPublished: true,
      createdBy: charlieLead.id,
      createdAt: daysAgo(90),
    },
  });

  const kbArticle5 = await prisma.knowledgeArticle.create({
    data: {
      title: 'Printer driver installation steps',
      body: `# Printer Driver Installation Steps

## Windows 10/11

### Automatic Installation (Recommended)
1. Go to **Settings > Bluetooth & Devices > Printers & Scanners**
2. Click **Add a printer or scanner**
3. Select the printer from the list
4. Windows will automatically download and install drivers

### Manual Installation
1. Download the latest driver from the manufacturer's website
2. Run the installer as Administrator
3. Follow the on-screen instructions
4. Select **Network Printer** when prompted for connection type
5. Enter the printer IP address or hostname
6. Complete the installation wizard

### Adding by IP Address
1. Open **Control Panel > Devices and Printers**
2. Click **Add a printer**
3. Select **Add a local printer or network printer with manual settings**
4. Choose **Create a new port > Standard TCP/IP Port**
5. Enter the printer's IP address
6. Select the appropriate driver from the list or browse to the downloaded driver

## Testing
1. Print a test page: Right-click printer > **Printer Properties** > **Print Test Page**
2. Verify the printer status shows "Ready"
3. Check if the printer responds to a ping command`,
      categoryId: catHardware.id,
      tags: ['printer', 'driver', 'installation'],
      viewCount: 156,
      helpfulCount: 22,
      notHelpfulCount: 5,
      isPublished: false,
      createdBy: jackAgent.id,
      createdAt: daysAgo(20),
    },
  });

  // An unpublished draft article
  await prisma.knowledgeArticle.create({
    data: {
      title: 'Database backup and recovery procedures',
      body: `# Database Backup and Recovery Procedures

## Backup Schedule
- Full backup: Daily at 2 AM
- Transaction log backup: Every 15 minutes
- Differential backup: Every 6 hours

## Recovery Steps
[Content pending review - draft only]`,
      categoryId: catDatabase.id,
      tags: ['database', 'backup', 'recovery'],
      viewCount: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      isPublished: false,
      createdBy: danaLead.id,
      createdAt: daysAgo(5),
    },
  });

  console.log('Knowledge articles created (6 total, 4 published, 2 drafts)');

  // --------------------------------------------------------------------------
  // 10. Create Sample Notifications
  // --------------------------------------------------------------------------

  const notifications = [
    // For Frank - assigned to critical problem
    {
      recipientId: frankAgent.id,
      recipientType: 'staff' as const,
      ticketId: problem1.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to problem ticket PRB-00001: "Recurring VPN authentication failures"`,
      sentVia: 'in_app' as const,
      createdAt: daysAgo(2),
    },
    // For Frank - new comment on incident
    {
      recipientId: frankAgent.id,
      recipientType: 'staff' as const,
      ticketId: incident1a.id,
      type: 'comment_added' as const,
      message: `John Smith added a comment to INC-00001: "Unable to connect to VPN from home office"`,
      sentVia: 'both' as const,
      createdAt: hoursAgo(20),
    },
    // For Hank - account lockout assignment
    {
      recipientId: hankAgent.id,
      recipientType: 'staff' as const,
      ticketId: incAccountLockout.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to INC-00007: "User account locked after multiple failed login attempts"`,
      sentVia: 'in_app' as const,
      createdAt: hoursAgo(2.5),
    },
    // For Ivy - database ticket
    {
      recipientId: ivyAgent.id,
      recipientType: 'staff' as const,
      ticketId: incDbPerf.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to INC-00008: "Slow database queries in financial reporting module"`,
      sentVia: 'both' as const,
      createdAt: hoursAgo(0.4),
    },
    // For Grace - email problem
    {
      recipientId: graceAgent.id,
      recipientType: 'staff' as const,
      ticketId: problem2.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to problem ticket PRB-00002: "Email delivery delays on Globex domain"`,
      sentVia: 'in_app' as const,
      createdAt: daysAgo(2),
    },
    // SLA warning for Frank on problem 1
    {
      recipientId: frankAgent.id,
      recipientType: 'staff' as const,
      ticketId: problem1.id,
      type: 'sla_warning' as const,
      message: `SLA warning: PRB-00001 resolution deadline approaching (due in 1 hour)`,
      sentVia: 'both' as const,
      createdAt: hoursAgo(1),
    },
    // For Jack - printer assignment
    {
      recipientId: jackAgent.id,
      recipientType: 'staff' as const,
      ticketId: incPrinter.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to INC-00006: "Printer not responding on floor 3"`,
      sentVia: 'in_app' as const,
      createdAt: hoursAgo(1),
    },
    // For Grace - license activation
    {
      recipientId: graceAgent.id,
      recipientType: 'staff' as const,
      ticketId: incLicense.id,
      type: 'ticket_assigned' as const,
      message: `You have been assigned to INC-00010: "Software license activation failed for new employee"`,
      sentVia: 'in_app' as const,
      createdAt: hoursAgo(3),
    },
    // For Evan (lead) - status update on problem 1
    {
      recipientId: evanLead.id,
      recipientType: 'staff' as const,
      ticketId: incAccountLockout.id,
      type: 'status_changed' as const,
      message: `Ticket INC-00007 status changed to in_progress and assigned to Hank Agent`,
      sentVia: 'in_app' as const,
      createdAt: hoursAgo(2),
    },
    // For Charlie (lead) - new problem created notification
    {
      recipientId: charlieLead.id,
      recipientType: 'staff' as const,
      ticketId: problem1.id,
      type: 'ticket_created' as const,
      message: `Problem ticket PRB-00001 created: "Recurring VPN authentication failures"`,
      sentVia: 'in_app' as const,
      createdAt: daysAgo(3),
    },
    // For Alex (super admin) - overview
    {
      recipientId: alexSuper.id,
      recipientType: 'staff' as const,
      ticketId: problem1.id,
      type: 'ticket_created' as const,
      message: `Critical problem ticket PRB-00001 created for Acme Corp requiring attention`,
      sentVia: 'email' as const,
      createdAt: daysAgo(3),
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({ data: notification });
  }

  console.log(`Notifications created (${notifications.length})`);

  // --------------------------------------------------------------------------
  // 11. Create Customer Feedback for resolved/closed tickets
  // --------------------------------------------------------------------------
  await prisma.customerFeedback.create({
    data: {
      ticketId: incident1a.id,
      clientContactId: acmeContact1.id,
      rating: 5,
      comment: 'Excellent response time. Issue was resolved within hours. Very satisfied with the support.',
    },
  });

  await prisma.customerFeedback.create({
    data: {
      ticketId: incBandwidth.id,
      clientContactId: acmeContact1.id,
      rating: 4,
      comment: 'Issue was resolved by upgrading the internet circuit. Took a few days but the solution is solid.',
    },
  });

  await prisma.customerFeedback.create({
    data: {
      ticketId: incDns.id,
      clientContactId: globexContact1.id,
      rating: 3,
      comment: 'Issue resolved but took longer than expected. Communication during the process was good.',
    },
  });

  await prisma.customerFeedback.create({
    data: {
      ticketId: incident2a.id,
      clientContactId: globexContact1.id,
      rating: 4,
      comment: 'Grace was very helpful in identifying the DNS misconfiguration. Appreciate the clear explanation.',
    },
  });

  await prisma.customerFeedback.create({
    data: {
      ticketId: incInstall.id,
      clientContactId: acmeContact1.id,
      rating: 5,
      comment: 'Ivy walked us through the installation step by step. AutoCAD is working perfectly now.',
    },
  });

  console.log('Customer feedback created (5 entries)');

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n========================================');
  console.log('  Database seeding completed successfully!');
  console.log('========================================');
  console.log(`  Teams:              3`);
  console.log(`  Users:             10`);
  console.log(`  SLA Policies:       2`);
  console.log(`  Clients:            3`);
  console.log(`  Client Contacts:    7`);
  console.log(`  Categories:         6`);
  console.log(`  Subcategories:     24`);
  console.log(`  Tickets:           19 (2 problems + 17 incidents)`);
  console.log(`  Comments:          10`);
  console.log(`  Activity Logs:     ${activityEntries.length}`);
  console.log(`  Knowledge Articles: 6`);
  console.log(`  Notifications:     ${notifications.length}`);
  console.log(`  Customer Feedback:  5`);
  console.log('========================================');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seeding failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
