const ids = {
  clients: {
    dental: "65f100000000000000000001",
    fitness: "65f100000000000000000002",
  },
  users: {
    superAdmin: "65f200000000000000000001",
    dentalAdmin: "65f200000000000000000002",
    dentalStaffLeads: "65f200000000000000000003",
    fitnessAdmin: "65f200000000000000000004",
    fitnessStaffReviews: "65f200000000000000000005",
  },
  leads: {
    dentalOne: "65f300000000000000000001",
    dentalTwo: "65f300000000000000000002",
    dentalThree: "65f300000000000000000003",
    fitnessOne: "65f300000000000000000004",
    fitnessTwo: "65f300000000000000000005",
  },
  appointments: {
    dentalOne: "65f400000000000000000001",
    dentalTwo: "65f400000000000000000002",
    fitnessOne: "65f400000000000000000003",
  },
  reviews: {
    dentalPositive: "65f500000000000000000001",
    dentalNegative: "65f500000000000000000002",
    fitnessPositive: "65f500000000000000000003",
    fitnessNegative: "65f500000000000000000004",
  },
  feedback: {
    dentalOpen: "65f600000000000000000001",
    fitnessResolved: "65f600000000000000000002",
  },
};

const password = "Password@123";

const clients = [
  {
    _id: ids.clients.dental,
    name: "Aarogya Dental Studio",
    subscriptionStatus: "active",
    renewalDate: new Date("2026-12-31T00:00:00.000Z"),
    googlePlaceId: "ChIJ0UngSh9N4DsRDogoKNznAN4",
    reviewsTaskId: "seed-task-aarogya-dental",
    plan: "pro",
    calendlyWebhookKey: "seed_calendly_dental_key",
  },
  {
    _id: ids.clients.fitness,
    name: "PulseFit Wellness",
    subscriptionStatus: "trial",
    renewalDate: new Date("2026-06-30T00:00:00.000Z"),
    googlePlaceId: "ChIJseedPulseFitWellness",
    reviewsTaskId: "seed-task-pulsefit",
    plan: "basic",
    calendlyWebhookKey: "seed_calendly_fitness_key",
  },
];

const users = [
  {
    _id: ids.users.superAdmin,
    name: "Platform Admin",
    email: "superadmin@test.local",
    role: "SUPER_ADMIN",
    clientId: null,
    assignedModules: [],
  },
  {
    _id: ids.users.dentalAdmin,
    name: "Dental Client Admin",
    email: "dental.admin@test.local",
    role: "CLIENT_ADMIN",
    clientId: ids.clients.dental,
    assignedModules: [],
  },
  {
    _id: ids.users.dentalStaffLeads,
    name: "Dental Front Desk",
    email: "dental.staff@test.local",
    role: "STAFF",
    clientId: ids.clients.dental,
    assignedModules: ["leads", "appointments"],
  },
  {
    _id: ids.users.fitnessAdmin,
    name: "Fitness Client Admin",
    email: "fitness.admin@test.local",
    role: "CLIENT_ADMIN",
    clientId: ids.clients.fitness,
    assignedModules: [],
  },
  {
    _id: ids.users.fitnessStaffReviews,
    name: "Fitness Reputation Staff",
    email: "fitness.staff@test.local",
    role: "STAFF",
    clientId: ids.clients.fitness,
    assignedModules: ["reviews", "feedback"],
  },
];

const leads = [
  {
    _id: ids.leads.dentalOne,
    name: "Rahul Mehta",
    mobile: "9876543210",
    area: "Vijay Nagar",
    clientId: ids.clients.dental,
    createdBy: ids.users.dentalStaffLeads,
  },
  {
    _id: ids.leads.dentalTwo,
    name: "Sneha Kapoor",
    mobile: "9876501234",
    area: "Palasia",
    clientId: ids.clients.dental,
    createdBy: ids.users.dentalAdmin,
  },
  {
    _id: ids.leads.dentalThree,
    name: "Amit Jain",
    mobile: "9898989898",
    area: "Scheme 54",
    clientId: ids.clients.dental,
    createdBy: ids.users.dentalStaffLeads,
  },
  {
    _id: ids.leads.fitnessOne,
    name: "Priya Sharma",
    mobile: "9123456780",
    area: "Bandra",
    clientId: ids.clients.fitness,
    createdBy: ids.users.fitnessAdmin,
  },
  {
    _id: ids.leads.fitnessTwo,
    name: "Karan Malhotra",
    mobile: "9000011111",
    area: "Andheri",
    clientId: ids.clients.fitness,
    createdBy: ids.users.fitnessAdmin,
  },
];

const appointments = [
  {
    _id: ids.appointments.dentalOne,
    name: "Sneha Kapoor",
    mobile: "9876501234",
    email: "sneha@example.com",
    gender: "female",
    age: 31,
    date: new Date("2026-05-02T10:30:00.000Z"),
    clientId: ids.clients.dental,
    source: "calendly",
  },
  {
    _id: ids.appointments.dentalTwo,
    name: "Amit Jain",
    mobile: "9898989898",
    email: "amit@example.com",
    gender: "male",
    age: 42,
    date: new Date("2026-05-04T15:00:00.000Z"),
    clientId: ids.clients.dental,
    source: "calendly",
  },
  {
    _id: ids.appointments.fitnessOne,
    name: "Priya Sharma",
    mobile: "9123456780",
    email: "priya@example.com",
    gender: "female",
    age: 27,
    date: new Date("2026-05-03T07:00:00.000Z"),
    clientId: ids.clients.fitness,
    source: "calendly",
  },
];

const reviews = [
  {
    _id: ids.reviews.dentalPositive,
    rating: 5,
    reviewText: "Clean clinic, quick appointment, and very helpful staff.",
    reviewerName: "Neha Singh",
    sentiment: "positive",
    reviewId: "seed-google-review-dental-positive",
    clientId: ids.clients.dental,
    createdAtSource: new Date("2026-04-26T11:00:00.000Z"),
  },
  {
    _id: ids.reviews.dentalNegative,
    rating: 2,
    reviewText: "I waited too long and did not get a follow-up call.",
    reviewerName: "Rohit Verma",
    sentiment: "negative",
    reviewId: "seed-google-review-dental-negative",
    clientId: ids.clients.dental,
    createdAtSource: new Date("2026-04-27T09:30:00.000Z"),
  },
  {
    _id: ids.reviews.fitnessPositive,
    rating: 4,
    reviewText: "Great trainers and clean workout floor.",
    reviewerName: "Ananya Rao",
    sentiment: "positive",
    reviewId: "seed-google-review-fitness-positive",
    clientId: ids.clients.fitness,
    createdAtSource: new Date("2026-04-25T14:00:00.000Z"),
  },
  {
    _id: ids.reviews.fitnessNegative,
    rating: 1,
    reviewText: "Membership cancellation took multiple calls.",
    reviewerName: "Vikram Nair",
    sentiment: "negative",
    reviewId: "seed-google-review-fitness-negative",
    clientId: ids.clients.fitness,
    createdAtSource: new Date("2026-04-28T16:45:00.000Z"),
  },
];

const feedback = [
  {
    _id: ids.feedback.dentalOpen,
    clientName: "Rohit Verma",
    clientMobile: "9777711111",
    reviewText: "I waited too long and did not get a follow-up call.",
    remark: "Call back, apologize, and offer priority slot.",
    reviewId: "seed-google-review-dental-negative",
    status: "open",
    clientId: ids.clients.dental,
  },
  {
    _id: ids.feedback.fitnessResolved,
    clientName: "Vikram Nair",
    clientMobile: "9666622222",
    reviewText: "Membership cancellation took multiple calls.",
    remark: "Resolved by branch manager.",
    reviewId: "seed-google-review-fitness-negative",
    status: "resolved",
    clientId: ids.clients.fitness,
  },
];

module.exports = {
  ids,
  password,
  clients,
  users,
  leads,
  appointments,
  reviews,
  feedback,
};
