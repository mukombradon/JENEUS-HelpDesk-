// ============================================================================
// JENEUS HelpDesk — Database Seed
// Populates demo data for development and testing.
// ============================================================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);
const addHours = (d: Date, h: number) => new Date(d.getTime() + h * 3_600_000);

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

function ticketNumber(type: 'incident' | 'problem', seq: number): string {
  const prefix = type === 'incident' ? 'INC' : 'PRB';
  return `${prefix}-${String(seq).padStart(4, '0')}`;
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------
async function main() {
  console.log('Seeding database ...');

  // ==========================================================================
  // 1. Users (5)
  // ==========================================================================
  const passwordHash = await hashPassword('password123');

  const superAdmin = await prisma.user.create({
    data: {
      firstName: 'System',
      lastName: 'Administrator',
      email: 'super_admin@jeneusco.com',
      passwordHash,
      role: 'super_admin',
    },
  });

  const admin = await prisma.user.create({
    data: {
      firstName: 'Alice',
      lastName: 'Johnson',
      email: 'admin@jeneusco.com',
      passwordHash,
      role: 'admin',
    },
  });

  const teamLead = await prisma.user.create({
    data: {
      firstName: 'Bob',
      lastName: 'Williams',
      email: 'teamlead@jeneusco.com',
      passwordHash,
      role: 'team_lead',
    },
  });

  const agent1 = await prisma.user.create({
    data: {
      firstName: 'Carol',
      lastName: 'Davis',
      email: 'agent1@jeneusco.com',
      passwordHash,
      role: 'agent',
    },
  });

  const agent2 = await prisma.user.create({
    data: {
      firstName: 'Dan',
      lastName: 'Martinez',
      email: 'agent2@jeneusco.com',
      passwordHash,
      role: 'agent',
    },
  });

  console.log('  Users created');

  // ==========================================================================
  // 2. Teams (4)
  // ==========================================================================
  const networkTeam = await prisma.team.create({
    data: {
      name: 'Network Support',
      leadId: teamLead.id,
      description: 'Handles network infrastructure, VPN, and connectivity issues',
    },
  });

  const softwareTeam = await prisma.team.create({
    data: {
      name: 'Software Team',
      leadId: admin.id,
      description: 'Handles application, OS, and software installation issues',
    },
  });

  const hardwareTeam = await prisma.team.create({
    data: {
      name: 'Hardware Support',
      leadId: agent1.id,
      description: 'Handles printer, peripheral, and hardware failure issues',
    },
  });

  const accessTeam = await prisma.team.create({
    data: {
      name: 'Access & Security',
      leadId: agent2.id,
      description: 'Handles account access, password, and security issues',
    },
  });

  console.log('  Teams created');

  // Assign users to teams
  await prisma.user.update({ where: { id: superAdmin.id }, data: { teamId: null } });
  await prisma.user.update({ where: { id: admin.id }, data: { teamId: softwareTeam.id } });
  await prisma.user.update({ where: { id: teamLead.id }, data: { teamId: networkTeam.id } });
  await prisma.user.update({ where: { id: agent1.id }, data: { teamId: hardwareTeam.id } });
  await prisma.user.update({ where: { id: agent2.id }, data: { teamId: accessTeam.id } });

  // ==========================================================================
  // 3. Categories + Subcategories (4 categories, 3 subcategories each)
  // ==========================================================================
  const networkCat = await prisma.category.create({
    data: { name: 'Network', icon: 'wifi', defaultTeamId: networkTeam.id },
  });
  const vpnSubcat = await prisma.subcategory.create({
    data: { categoryId: networkCat.id, name: 'VPN Issue' },
  });
  const dnsSubcat = await prisma.subcategory.create({
    data: { categoryId: networkCat.id, name: 'DNS Issue' },
  });
  const connectivitySubcat = await prisma.subcategory.create({
    data: { categoryId: networkCat.id, name: 'Connectivity Problem' },
  });

  const softwareCat = await prisma.category.create({
    data: { name: 'Software', icon: 'code', defaultTeamId: softwareTeam.id },
  });
  const crashSubcat = await prisma.subcategory.create({
    data: { categoryId: softwareCat.id, name: 'Application Crash' },
  });
  const installSubcat = await prisma.subcategory.create({
    data: { categoryId: softwareCat.id, name: 'Installation Error' },
  });
  const updateSubcat = await prisma.subcategory.create({
    data: { categoryId: softwareCat.id, name: 'Update Problem' },
  });

  const hardwareCat = await prisma.category.create({
    data: { name: 'Hardware', icon: 'monitor', defaultTeamId: hardwareTeam.id },
  });
  const printerSubcat = await prisma.subcategory.create({
    data: { categoryId: hardwareCat.id, name: 'Printer Failure' },
  });
  const keyboardSubcat = await prisma.subcategory.create({
    data: { categoryId: hardwareCat.id, name: 'Keyboard/Mouse Issue' },
  });
  const monitorSubcat = await prisma.subcategory.create({
    data: { categoryId: hardwareCat.id, name: 'Monitor Issue' },
  });

  const accessCat = await prisma.category.create({
    data: { name: 'Access & Security', icon: 'shield', defaultTeamId: accessTeam.id },
  });
  const passwordSubcat = await prisma.subcategory.create({
    data: { categoryId: accessCat.id, name: 'Password Reset' },
  });
  const lockedSubcat = await prisma.subcategory.create({
    data: { categoryId: accessCat.id, name: 'Account Locked' },
  });
  const permissionSubcat = await prisma.subcategory.create({
    data: { categoryId: accessCat.id, name: 'Permission Error' },
  });

  console.log('  Categories & Subcategories created');

  // ==========================================================================
  // 4. SLA Policies (3)
  // ==========================================================================
  const enterpriseSLA = await prisma.sLAPolicy.create({
    data: {
      name: 'Enterprise 24/7',
      description: 'Enterprise-level support with 24/7 coverage and fastest response times',
      rules: {
        critical: { responseHours: 1, resolutionHours: 4 },
        high: { responseHours: 2, resolutionHours: 8 },
        medium: { responseHours: 4, resolutionHours: 24 },
        low: { responseHours: 8, resolutionHours: 48 },
      },
      businessHoursOnly: false,
    },
  });

  const premiumSLA = await prisma.sLAPolicy.create({
    data: {
      name: 'Premium Business Hours',
      description: 'Premium support during standard business hours',
      rules: {
        critical: { responseHours: 2, resolutionHours: 8 },
        high: { responseHours: 4, resolutionHours: 24 },
        medium: { responseHours: 8, resolutionHours: 48 },
        low: { responseHours: 24, resolutionHours: 72 },
      },
      businessHoursOnly: true,
      businessHours: {
        start: '09:00',
        end: '18:00',
        timezone: 'America/New_York',
        businessDays: [1, 2, 3, 4, 5],
      },
    },
  });

  const basicSLA = await prisma.sLAPolicy.create({
    data: {
      name: 'Basic',
      description: 'Basic support with standard response and resolution times',
      rules: {
        critical: { responseHours: 4, resolutionHours: 24 },
        high: { responseHours: 8, resolutionHours: 48 },
        medium: { responseHours: 24, resolutionHours: 72 },
        low: { responseHours: 48, resolutionHours: 120 },
      },
      businessHoursOnly: false,
    },
  });

  console.log('  SLA Policies created');

  // ==========================================================================
  // 5. Clients (3) + Contacts (2-3 each)
  // ==========================================================================

  // --- Acme Corp (enterprise, Enterprise SLA) ---
  const acmeCorp = await prisma.client.create({
    data: {
      name: 'Acme Corp',
      industry: 'Manufacturing',
      contractTier: 'enterprise',
      slaPolicyId: enterpriseSLA.id,
      accountManagerId: superAdmin.id,
    },
  });

  const acmeContact1 = await prisma.clientContact.create({
    data: {
      clientId: acmeCorp.id,
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@acmecorp.com',
      phone: '+1-555-0100',
      role: 'IT Manager',
      isPrimary: true,
    },
  });

  const acmeContact2 = await prisma.clientContact.create({
    data: {
      clientId: acmeCorp.id,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane.doe@acmecorp.com',
      phone: '+1-555-0101',
      role: 'Network Admin',
      isPrimary: false,
    },
  });

  const acmeContact3 = await prisma.clientContact.create({
    data: {
      clientId: acmeCorp.id,
      firstName: 'Bob',
      lastName: 'Thompson',
      email: 'bob.thompson@acmecorp.com',
      phone: '+1-555-0102',
      role: 'Helpdesk Coordinator',
      isPrimary: false,
    },
  });

  await prisma.client.update({
    where: { id: acmeCorp.id },
    data: { primaryContactId: acmeContact1.id },
  });

  // --- Globex Inc (standard, Premium SLA) ---
  const globexInc = await prisma.client.create({
    data: {
      name: 'Globex Inc',
      industry: 'Technology',
      contractTier: 'standard',
      slaPolicyId: premiumSLA.id,
      accountManagerId: admin.id,
    },
  });

  const globexContact1 = await prisma.clientContact.create({
    data: {
      clientId: globexInc.id,
      firstName: 'Sarah',
      lastName: 'Connor',
      email: 'sarah.connor@globexinc.com',
      phone: '+1-555-0200',
      role: 'IT Director',
      isPrimary: true,
    },
  });

  const globexContact2 = await prisma.clientContact.create({
    data: {
      clientId: globexInc.id,
      firstName: 'Kyle',
      lastName: 'Reese',
      email: 'kyle.reese@globexinc.com',
      phone: '+1-555-0201',
      role: 'System Administrator',
      isPrimary: false,
    },
  });

  await prisma.client.update({
    where: { id: globexInc.id },
    data: { primaryContactId: globexContact1.id },
  });

  // --- Initech (basic, Basic SLA) ---
  const initech = await prisma.client.create({
    data: {
      name: 'Initech',
      industry: 'Finance',
      contractTier: 'basic',
      slaPolicyId: basicSLA.id,
      accountManagerId: teamLead.id,
    },
  });

  const initechContact1 = await prisma.clientContact.create({
    data: {
      clientId: initech.id,
      firstName: 'Michael',
      lastName: 'Bolton',
      email: 'michael.bolton@initech.com',
      phone: '+1-555-0300',
      role: 'Office Manager',
      isPrimary: true,
    },
  });

  const initechContact2 = await prisma.clientContact.create({
    data: {
      clientId: initech.id,
      firstName: 'Samir',
      lastName: 'Nagheenanajar',
      email: 'samir.n@initech.com',
      phone: '+1-555-0301',
      role: 'Developer',
      isPrimary: false,
    },
  });

  await prisma.client.update({
    where: { id: initech.id },
    data: { primaryContactId: initechContact1.id },
  });

  console.log('  Clients & Contacts created');

  // ==========================================================================
  // 5b. Create User records for client contacts (needed for ticket.createdBy)
  // ==========================================================================
  const acmeUser1 = await prisma.user.create({
    data: {
      firstName: acmeContact1.firstName,
      lastName: acmeContact1.lastName,
      email: acmeContact1.email,
      passwordHash,
      role: 'client',
    },
  });
  const acmeUser2 = await prisma.user.create({
    data: {
      firstName: acmeContact2.firstName,
      lastName: acmeContact2.lastName,
      email: acmeContact2.email,
      passwordHash,
      role: 'client',
    },
  });
  const acmeUser3 = await prisma.user.create({
    data: {
      firstName: acmeContact3.firstName,
      lastName: acmeContact3.lastName,
      email: acmeContact3.email,
      passwordHash,
      role: 'client',
    },
  });
  const globexUser1 = await prisma.user.create({
    data: {
      firstName: globexContact1.firstName,
      lastName: globexContact1.lastName,
      email: globexContact1.email,
      passwordHash,
      role: 'client',
    },
  });
  const globexUser2 = await prisma.user.create({
    data: {
      firstName: globexContact2.firstName,
      lastName: globexContact2.lastName,
      email: globexContact2.email,
      passwordHash,
      role: 'client',
    },
  });
  const initechUser1 = await prisma.user.create({
    data: {
      firstName: initechContact1.firstName,
      lastName: initechContact1.lastName,
      email: initechContact1.email,
      passwordHash,
      role: 'client',
    },
  });
  const initechUser2 = await prisma.user.create({
    data: {
      firstName: initechContact2.firstName,
      lastName: initechContact2.lastName,
      email: initechContact2.email,
      passwordHash,
      role: 'client',
    },
  });
  console.log('  Client user accounts created');

  // ==========================================================================
  // 6. Tickets (3 problems + 12 incidents = 15)
  // ==========================================================================

  // --- Problem 1: PRB-0001 — VPN (Acme Corp, Network) ---
  const problem1 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('problem', 1),
      type: 'problem',
      title: 'Recurring VPN connectivity issues across multiple sites',
      description:
        'Multiple users across three branch offices are experiencing intermittent VPN ' +
        'disconnections. Pattern shows increased frequency during peak hours. Initial ' +
        'investigations point to a potential configuration issue on the main gateway. ' +
        '4 related incidents already resolved with temporary fixes.',
      status: 'resolved',
      priority: 'high',
      categoryId: networkCat.id,
      subcategoryId: vpnSubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: teamLead.id,
      assignedTeamId: networkTeam.id,
      createdBy: acmeUser1.id,
      slaPolicyId: enterpriseSLA.id,
      recurrenceCount: 4,
      responseDueAt: addHours(daysAgo(25), 2),
      resolutionDueAt: addHours(daysAgo(25), 8),
      firstResponseAt: hoursAgo(590),
      resolvedAt: daysAgo(20),
      source: 'portal',
      tags: ['vpn', 'recurring', 'network'],
      createdAt: daysAgo(25),
    },
  });

  // --- Problem 2: PRB-0002 — ERP Crash (Globex Inc, Software) ---
  const problem2 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('problem', 2),
      type: 'problem',
      title: 'ERP application crashes after quarterly update',
      description:
        'Since the quarterly patch v4.2.1 was deployed, the ERP main module crashes when ' +
        'generating financial reports. Affects all users. Rollback is not an option due ' +
        'to database migration dependencies. Vendor has been contacted for hotfix.',
      status: 'in_progress',
      priority: 'critical',
      categoryId: softwareCat.id,
      subcategoryId: crashSubcat.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: agent1.id,
      assignedTeamId: softwareTeam.id,
      createdBy: globexUser1.id,
      slaPolicyId: premiumSLA.id,
      responseDueAt: addHours(daysAgo(5), 2),
      resolutionDueAt: addHours(daysAgo(5), 8),
      firstResponseAt: daysAgo(4),
      source: 'email',
      tags: ['erp', 'crash', 'update', 'critical'],
      createdAt: daysAgo(5),
    },
  });

  // --- Problem 3: PRB-0003 — Printer Firmware (Initech, Hardware) ---
  const problem3 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('problem', 3),
      type: 'problem',
      title: 'Printer firmware incompatibility with print server',
      description:
        'After the print server was updated to PrintServer v3.0, all HP LaserJet printers ' +
        'with firmware version 2.1.x fail to print. Devices with firmware 2.2.x work ' +
        'correctly. Vendor has acknowledged the issue but no patch is available yet.',
      status: 'open',
      priority: 'medium',
      categoryId: hardwareCat.id,
      subcategoryId: printerSubcat.id,
      clientId: initech.id,
      contactId: initechContact1.id,
      assignedAgentId: agent2.id,
      assignedTeamId: hardwareTeam.id,
      createdBy: initechUser1.id,
      slaPolicyId: basicSLA.id,
      responseDueAt: addHours(daysAgo(3), 24),
      resolutionDueAt: addHours(daysAgo(3), 72),
      source: 'phone',
      tags: ['printer', 'firmware', 'print-server'],
      createdAt: daysAgo(3),
    },
  });

  // --- INC-0001: VPN drops (Acme Corp, resolved, linked to PRB-0001) ---
  const inc1 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 1),
      type: 'incident',
      title: 'VPN connection drops every 30 minutes',
      description:
        'VPN connection to headquarters drops consistently every 30 minutes, requiring ' +
        'manual reconnection. Issue started 2 days ago. Client is using the latest VPN ' +
        'client v3.1.2.',
      status: 'resolved',
      priority: 'high',
      categoryId: networkCat.id,
      subcategoryId: vpnSubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact2.id,
      assignedAgentId: teamLead.id,
      assignedTeamId: networkTeam.id,
      createdBy: acmeUser2.id,
      parentProblemId: problem1.id,
      slaPolicyId: enterpriseSLA.id,
      responseDueAt: addHours(daysAgo(30), 2),
      resolutionDueAt: addHours(daysAgo(30), 8),
      firstResponseAt: hoursAgo(715),
      resolvedAt: daysAgo(28),
      source: 'portal',
      tags: ['vpn', 'timeout'],
      createdAt: daysAgo(30),
    },
  });

  // --- INC-0002: DNS issue (Acme Corp, resolved) ---
  const inc2 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 2),
      type: 'incident',
      title: 'Unable to resolve internal domain names',
      description:
        'Several internal domain names (app.acme.internal, db.acme.internal) are not ' +
        'resolving. External DNS works fine. Issue affects approximately 50 users.',
      status: 'resolved',
      priority: 'high',
      categoryId: networkCat.id,
      subcategoryId: dnsSubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: teamLead.id,
      assignedTeamId: networkTeam.id,
      createdBy: acmeUser1.id,
      slaPolicyId: enterpriseSLA.id,
      responseDueAt: addHours(daysAgo(28), 2),
      resolutionDueAt: addHours(daysAgo(28), 8),
      firstResponseAt: hoursAgo(665),
      resolvedAt: daysAgo(26),
      source: 'portal',
      tags: ['dns', 'internal'],
      createdAt: daysAgo(28),
    },
  });

  // --- INC-0003: Connectivity (Acme Corp, resolved) ---
  const inc3 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 3),
      type: 'incident',
      title: 'Cannot reach file server from branch office',
      description:
        'Branch office in Chicago cannot access the main file server ' +
        '(files.acmecorp.com). Other services are accessible. Ping to file server IP ' +
        'succeeds but SMB connection fails.',
      status: 'resolved',
      priority: 'medium',
      categoryId: networkCat.id,
      subcategoryId: connectivitySubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact3.id,
      assignedAgentId: agent1.id,
      assignedTeamId: networkTeam.id,
      createdBy: acmeUser3.id,
      slaPolicyId: enterpriseSLA.id,
      responseDueAt: addHours(daysAgo(26), 4),
      resolutionDueAt: addHours(daysAgo(26), 24),
      firstResponseAt: hoursAgo(620),
      resolvedAt: daysAgo(24),
      source: 'phone',
      tags: ['connectivity', 'file-server', 'branch-office'],
      createdAt: daysAgo(26),
    },
  });

  // --- INC-0004: VPN auth (Acme Corp, resolved, linked to PRB-0001) ---
  const inc4 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 4),
      type: 'incident',
      title: 'VPN client fails to authenticate after update',
      description:
        'VPN client fails with authentication error after updating to version 3.2.0. ' +
        'Reverting to 3.1.2 resolves the issue temporarily. Affects 15 users in the ' +
        'sales department.',
      status: 'resolved',
      priority: 'high',
      categoryId: networkCat.id,
      subcategoryId: vpnSubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact2.id,
      assignedAgentId: teamLead.id,
      assignedTeamId: networkTeam.id,
      createdBy: acmeUser2.id,
      parentProblemId: problem1.id,
      slaPolicyId: enterpriseSLA.id,
      responseDueAt: addHours(daysAgo(22), 2),
      resolutionDueAt: addHours(daysAgo(22), 8),
      firstResponseAt: hoursAgo(520),
      resolvedAt: daysAgo(20),
      source: 'portal',
      tags: ['vpn', 'authentication', 'update'],
      createdAt: daysAgo(22),
    },
  });

  // --- INC-0005: Salesforce crash (Acme Corp, in_progress) ---
  const inc5 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 5),
      type: 'incident',
      title: 'Salesforce application freezes on launch',
      description:
        'Salesforce desktop application freezes immediately on launch for 3 users in ' +
        'the sales team. Browser version works fine. Cleared cache and reinstalled but ' +
        'issue persists.',
      status: 'in_progress',
      priority: 'medium',
      categoryId: softwareCat.id,
      subcategoryId: crashSubcat.id,
      clientId: acmeCorp.id,
      contactId: acmeContact1.id,
      assignedAgentId: agent2.id,
      assignedTeamId: softwareTeam.id,
      createdBy: acmeUser1.id,
      slaPolicyId: enterpriseSLA.id,
      responseDueAt: addHours(daysAgo(7), 4),
      resolutionDueAt: addHours(daysAgo(7), 24),
      firstResponseAt: daysAgo(6),
      source: 'portal',
      tags: ['salesforce', 'crash', 'desktop'],
      createdAt: daysAgo(7),
    },
  });

  // --- INC-0006: ERP crash (Globex Inc, resolved, linked to PRB-0002) ---
  const inc6 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 6),
      type: 'incident',
      title: 'ERP main module crashes on report generation',
      description:
        'When attempting to generate Q3 financial reports, the ERP main module crashes ' +
        'with error code 0x87AF. This started after the v4.2.1 update.',
      status: 'resolved',
      priority: 'critical',
      categoryId: softwareCat.id,
      subcategoryId: crashSubcat.id,
      clientId: globexInc.id,
      contactId: globexContact2.id,
      assignedAgentId: agent1.id,
      assignedTeamId: softwareTeam.id,
      createdBy: globexUser2.id,
      parentProblemId: problem2.id,
      slaPolicyId: premiumSLA.id,
      responseDueAt: addHours(daysAgo(6), 2),
      resolutionDueAt: addHours(daysAgo(6), 8),
      firstResponseAt: daysAgo(5),
      resolvedAt: daysAgo(4),
      source: 'email',
      tags: ['erp', 'crash', 'reports'],
      createdAt: daysAgo(6),
    },
  });

  // --- INC-0007: Password reset (Globex Inc, open, unassigned) ---
  const inc7 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 7),
      type: 'incident',
      title: 'Unable to reset portal password',
      description:
        'User cannot reset their portal password. The "Forgot Password" link sends the ' +
        'email but the reset link returns a 404 error. Tried with multiple browsers.',
      status: 'open',
      priority: 'medium',
      categoryId: accessCat.id,
      subcategoryId: passwordSubcat.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: null,
      assignedTeamId: accessTeam.id,
      createdBy: globexUser1.id,
      slaPolicyId: premiumSLA.id,
      responseDueAt: addHours(daysAgo(2), 8),
      resolutionDueAt: addHours(daysAgo(2), 48),
      source: 'portal',
      tags: ['password', 'portal', 'password-reset'],
      createdAt: daysAgo(2),
    },
  });

  // --- INC-0008: Keyboard issue (Globex Inc, pending) ---
  const inc8 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 8),
      type: 'incident',
      title: 'Keyboard not working after driver update',
      description:
        'Wireless keyboard stopped working after automatic Windows Update driver ' +
        'installation. USB receiver is detected but no key presses registered.',
      status: 'pending',
      priority: 'low',
      categoryId: hardwareCat.id,
      subcategoryId: keyboardSubcat.id,
      clientId: globexInc.id,
      contactId: globexContact2.id,
      assignedAgentId: agent1.id,
      assignedTeamId: hardwareTeam.id,
      createdBy: globexUser2.id,
      slaPolicyId: premiumSLA.id,
      responseDueAt: addHours(daysAgo(4), 24),
      resolutionDueAt: addHours(daysAgo(4), 72),
      firstResponseAt: daysAgo(3),
      source: 'portal',
      tags: ['keyboard', 'driver', 'usb'],
      createdAt: daysAgo(4),
    },
  });

  // --- INC-0009: Account locked (Globex Inc, in_progress) ---
  const inc9 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 9),
      type: 'incident',
      title: 'Account locked after multiple failed login attempts',
      description:
        'User account was locked after 3 failed login attempts. This is a new employee ' +
        'who was given the wrong password by HR. Account needs to be unlocked urgently.',
      status: 'in_progress',
      priority: 'high',
      categoryId: accessCat.id,
      subcategoryId: lockedSubcat.id,
      clientId: globexInc.id,
      contactId: globexContact1.id,
      assignedAgentId: agent2.id,
      assignedTeamId: accessTeam.id,
      createdBy: globexUser1.id,
      slaPolicyId: premiumSLA.id,
      responseDueAt: addHours(daysAgo(1), 4),
      resolutionDueAt: addHours(daysAgo(1), 24),
      firstResponseAt: hoursAgo(20),
      source: 'phone',
      tags: ['account-locked', 'new-employee', 'urgent'],
      createdAt: daysAgo(1),
    },
  });

  // --- INC-0010: Printer offline (Initech, resolved, linked to PRB-0003) ---
  const inc10 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 10),
      type: 'incident',
      title: 'Network printer shows offline after firmware update',
      description:
        'HP LaserJet P3015 shows as offline on the network after automatic firmware ' +
        'update was pushed. Printer itself is powered on and displays ready status locally.',
      status: 'resolved',
      priority: 'medium',
      categoryId: hardwareCat.id,
      subcategoryId: printerSubcat.id,
      clientId: initech.id,
      contactId: initechContact1.id,
      assignedAgentId: agent1.id,
      assignedTeamId: hardwareTeam.id,
      createdBy: initechUser1.id,
      parentProblemId: problem3.id,
      slaPolicyId: basicSLA.id,
      responseDueAt: addHours(daysAgo(10), 24),
      resolutionDueAt: addHours(daysAgo(10), 72),
      firstResponseAt: daysAgo(9),
      resolvedAt: daysAgo(7),
      source: 'portal',
      tags: ['printer', 'firmware', 'offline'],
      createdAt: daysAgo(10),
    },
  });

  // --- INC-0011: Cannot access shared drive (Initech, cancelled) ---
  const inc11 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 11),
      type: 'incident',
      title: 'Cannot access shared drive on server',
      description:
        'User cannot access the shared drive. Error says "Access denied". User was ' +
        'added to the appropriate AD group yesterday.',
      status: 'cancelled',
      priority: 'medium',
      categoryId: accessCat.id,
      subcategoryId: permissionSubcat.id,
      clientId: initech.id,
      contactId: initechContact2.id,
      assignedAgentId: agent2.id,
      assignedTeamId: accessTeam.id,
      createdBy: initechUser2.id,
      slaPolicyId: basicSLA.id,
      responseDueAt: addHours(daysAgo(8), 24),
      resolutionDueAt: addHours(daysAgo(8), 72),
      firstResponseAt: daysAgo(7),
      resolvedAt: daysAgo(6),
      source: 'portal',
      tags: ['shared-drive', 'access-denied'],
      createdAt: daysAgo(8),
    },
  });

  // --- INC-0012: New hire email (Initech, in_progress, unassigned) ---
  const inc12 = await prisma.ticket.create({
    data: {
      ticketNumber: ticketNumber('incident', 12),
      type: 'incident',
      title: 'New employee cannot access corporate email',
      description:
        'New hire started today but cannot log into Outlook with provided credentials. ' +
        'Account was created in Active Directory but mailbox provisioning may not have ' +
        'completed.',
      status: 'in_progress',
      priority: 'high',
      categoryId: accessCat.id,
      subcategoryId: permissionSubcat.id,
      clientId: initech.id,
      contactId: initechContact1.id,
      assignedAgentId: null,
      assignedTeamId: null,
      createdBy: initechUser1.id,
      slaPolicyId: basicSLA.id,
      responseDueAt: addHours(now, 8),
      resolutionDueAt: addHours(now, 48),
      source: 'phone',
      tags: ['email', 'new-employee', 'outlook'],
      createdAt: now,
    },
  });

  console.log('  Tickets created (3 problems + 12 incidents = 15)');

  // ==========================================================================
  // 7. Comments (7)
  // ==========================================================================

  // INC-0001: VPN drops -- staff investigation + client confirmation
  await prisma.comment.createMany({
    data: [
      {
        ticketId: inc1.id,
        authorId: teamLead.id,
        authorType: 'staff',
        body:
          'Investigated the VPN gateway logs. Found that the session timeout is set to ' +
          '1800 seconds (30 minutes) on the main gateway, conflicting with the client-side ' +
          'keep-alive setting. Will update gateway configuration to extend timeout to 7200 seconds.',
        isInternal: false,
        createdAt: hoursAgo(712),
      },
      {
        ticketId: inc1.id,
        authorId: acmeContact2.id,
        authorType: 'client',
        body:
          'The fix has resolved the issue. VPN connection has been stable for over 4 hours ' +
          'without drops. Thank you!',
        isInternal: false,
        createdAt: hoursAgo(670),
      },
    ],
  });

  // INC-0005: Salesforce crash -- staff update
  await prisma.comment.create({
    data: {
      ticketId: inc5.id,
      authorId: agent2.id,
      authorType: 'staff',
      body:
        'Reproduced the issue on a test machine. Found a conflicting Salesforce extension ' +
        'in Chrome. Waiting for user to confirm if they have the same extension installed.',
      isInternal: false,
      createdAt: daysAgo(5),
    },
  });

  // INC-0007: Password reset -- client request for ETA
  await prisma.comment.create({
    data: {
      ticketId: inc7.id,
      authorId: globexContact1.id,
      authorType: 'client',
      body:
        'This is affecting multiple users now. Can we get an ETA on the fix? The 404 error ' +
        'is happening consistently on the password reset endpoint.',
      isInternal: false,
      createdAt: hoursAgo(12),
    },
  });

  // INC-0008: Keyboard issue -- staff note (driver rollback, awaiting vendor)
  await prisma.comment.create({
    data: {
      ticketId: inc8.id,
      authorId: agent1.id,
      authorType: 'staff',
      body:
        'Rolled back the driver to the previous version. Keyboard works again but Windows ' +
        'keeps reinstalling the bad driver. Disabled automatic driver updates for this ' +
        'device. Waiting for vendor to release a fixed driver.',
      isInternal: false,
      createdAt: daysAgo(3),
    },
  });

  // INC-0009: Account locked -- staff action (unlocked, resolved)
  await prisma.comment.create({
    data: {
      ticketId: inc9.id,
      authorId: agent2.id,
      authorType: 'staff',
      body:
        'Unlocked the account and reset the password. Confirmed with HR that the correct ' +
        'initial password was provided. User has logged in successfully.',
      isInternal: false,
      createdAt: hoursAgo(18),
    },
  });

  // INC-0012: New hire email -- staff internal note
  await prisma.comment.create({
    data: {
      ticketId: inc12.id,
      authorId: teamLead.id,
      authorType: 'staff',
      body:
        'Checked AD -- account exists but Exchange mailbox provisioning is stuck. Restarting ' +
        'the provisioning service on the Exchange server. This is an internal note for now.',
      isInternal: true,
      createdAt: hoursAgo(2),
    },
  });

  console.log('  Comments created');

  // ==========================================================================
  // 8. Activity Logs
  // ==========================================================================

  // PRB-0001: created -> assigned -> in_progress -> resolved
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: problem1.id,
        actorId: acmeContact1.id,
        actorType: 'client',
        action: 'created',
        newValue: 'open',
        createdAt: daysAgo(25),
      },
      {
        ticketId: problem1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'assigned',
        newValue: teamLead.id,
        createdAt: daysAgo(25),
      },
      {
        ticketId: problem1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: daysAgo(25),
      },
      {
        ticketId: problem1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'resolved',
        createdAt: daysAgo(20),
      },
    ],
  });

  // PRB-0002: created -> assigned -> priority change -> in_progress
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: problem2.id,
        actorId: globexContact1.id,
        actorType: 'client',
        action: 'created',
        newValue: 'open',
        createdAt: daysAgo(5),
      },
      {
        ticketId: problem2.id,
        actorId: agent1.id,
        actorType: 'staff',
        action: 'assigned',
        newValue: agent1.id,
        createdAt: daysAgo(5),
      },
      {
        ticketId: problem2.id,
        actorId: superAdmin.id,
        actorType: 'staff',
        action: 'priority_changed',
        oldValue: 'high',
        newValue: 'critical',
        createdAt: daysAgo(5),
      },
      {
        ticketId: problem2.id,
        actorId: agent1.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: daysAgo(4),
      },
    ],
  });

  // INC-0001: created -> assigned -> in_progress -> resolved + linked
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: inc1.id,
        actorId: acmeContact2.id,
        actorType: 'client',
        action: 'created',
        newValue: 'open',
        createdAt: daysAgo(30),
      },
      {
        ticketId: inc1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'assigned',
        newValue: teamLead.id,
        createdAt: daysAgo(30),
      },
      {
        ticketId: inc1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: daysAgo(30),
      },
      {
        ticketId: inc1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'resolved',
        createdAt: daysAgo(28),
      },
      {
        ticketId: inc1.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'linked_to_problem',
        newValue: problem1.id,
        createdAt: daysAgo(28),
      },
    ],
  });

  // INC-0005: created -> assigned -> in_progress
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: inc5.id,
        actorId: acmeContact1.id,
        actorType: 'client',
        action: 'created',
        newValue: 'open',
        createdAt: daysAgo(7),
      },
      {
        ticketId: inc5.id,
        actorId: admin.id,
        actorType: 'staff',
        action: 'assigned',
        newValue: agent2.id,
        createdAt: daysAgo(7),
      },
      {
        ticketId: inc5.id,
        actorId: agent2.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: daysAgo(6),
      },
    ],
  });

  // INC-0007: created only (no assignment yet)
  await prisma.activityLog.create({
    data: {
      ticketId: inc7.id,
      actorId: globexContact1.id,
      actorType: 'client',
      action: 'created',
      newValue: 'open',
      createdAt: daysAgo(2),
    },
  });

  // INC-0011: created -> assigned -> in_progress -> cancelled
  await prisma.activityLog.createMany({
    data: [
      {
        ticketId: inc11.id,
        actorId: initechContact2.id,
        actorType: 'client',
        action: 'created',
        newValue: 'open',
        createdAt: daysAgo(8),
      },
      {
        ticketId: inc11.id,
        actorId: teamLead.id,
        actorType: 'staff',
        action: 'assigned',
        newValue: agent2.id,
        createdAt: daysAgo(8),
      },
      {
        ticketId: inc11.id,
        actorId: agent2.id,
        actorType: 'staff',
        action: 'status_changed',
        oldValue: 'open',
        newValue: 'in_progress',
        createdAt: daysAgo(7),
      },
      {
        ticketId: inc11.id,
        actorId: initechContact2.id,
        actorType: 'client',
        action: 'status_changed',
        oldValue: 'in_progress',
        newValue: 'cancelled',
        createdAt: daysAgo(6),
      },
    ],
  });

  // INC-0012: created only
  await prisma.activityLog.create({
    data: {
      ticketId: inc12.id,
      actorId: initechContact1.id,
      actorType: 'client',
      action: 'created',
      newValue: 'open',
      createdAt: now,
    },
  });

  console.log('  Activity logs created');

  // ==========================================================================
  // 9. Customer Feedback (for resolved tickets)
  // ==========================================================================
  await prisma.customerFeedback.createMany({
    data: [
      {
        ticketId: inc1.id,
        clientContactId: acmeContact2.id,
        rating: 5,
        comment: 'Excellent support. VPN issue was resolved quickly.',
        createdAt: daysAgo(27),
      },
      {
        ticketId: inc2.id,
        clientContactId: acmeContact1.id,
        rating: 4,
        comment: 'DNS resolution fixed within SLA. Good communication throughout.',
        createdAt: daysAgo(25),
      },
      {
        ticketId: inc3.id,
        clientContactId: acmeContact3.id,
        rating: 5,
        comment: 'Branch office connectivity restored. Very professional team.',
        createdAt: daysAgo(23),
      },
      {
        ticketId: inc4.id,
        clientContactId: acmeContact2.id,
        rating: 4,
        comment: 'Fixed the VPN auth issue. Would appreciate faster response next time.',
        createdAt: daysAgo(19),
      },
      {
        ticketId: inc6.id,
        clientContactId: globexContact2.id,
        rating: 3,
        comment: 'Issue is resolved for now but we need a permanent fix for the ERP module.',
        createdAt: daysAgo(3),
      },
    ],
  });

  console.log('  Customer feedback created');
  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
