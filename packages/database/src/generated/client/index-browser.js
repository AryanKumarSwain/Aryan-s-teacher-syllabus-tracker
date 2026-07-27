
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  role: 'role',
  schoolId: 'schoolId',
  avatar: 'avatar',
  phone: 'phone',
  status: 'status',
  lastLoginAt: 'lastLoginAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  tokenHash: 'tokenHash',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  revokedAt: 'revokedAt'
};

exports.Prisma.SchoolScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  email: 'email',
  phone: 'phone',
  address: 'address',
  logo: 'logo',
  status: 'status',
  currentAcademicSessionId: 'currentAcademicSessionId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AcademicSessionScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  name: 'name',
  status: 'status',
  isArchived: 'isArchived',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SubscriptionPlanScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  description: 'description',
  priceMonthly: 'priceMonthly',
  priceYearly: 'priceYearly',
  teacherLimit: 'teacherLimit',
  features: 'features',
  isActive: 'isActive',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  planId: 'planId',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TeacherScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  userId: 'userId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ClassScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  name: 'name',
  grade: 'grade',
  section: 'section',
  description: 'description',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.SubjectScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  classId: 'classId',
  name: 'name',
  code: 'code',
  description: 'description',
  color: 'color',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ChapterScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  subjectId: 'subjectId',
  classId: 'classId',
  title: 'title',
  description: 'description',
  notes: 'notes',
  estimatedTeachingDays: 'estimatedTeachingDays',
  chapterNo: 'chapterNo',
  termName: 'termName',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TopicScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  chapterId: 'chapterId',
  title: 'title',
  description: 'description',
  notes: 'notes',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.TeacherClassScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  teacherId: 'teacherId',
  classId: 'classId',
  subjectId: 'subjectId',
  createdAt: 'createdAt'
};

exports.Prisma.ChapterProgressScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  chapterId: 'chapterId',
  teacherId: 'teacherId',
  teachingCompleted: 'teachingCompleted',
  qaCompleted: 'qaCompleted',
  copyChecked: 'copyChecked',
  chapterStatus: 'chapterStatus',
  completionPercentage: 'completionPercentage',
  completedAt: 'completedAt',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TopicProgressScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  topicId: 'topicId',
  teacherId: 'teacherId',
  status: 'status',
  completedAt: 'completedAt',
  updatedById: 'updatedById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExamPaperScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  teacherId: 'teacherId',
  classId: 'classId',
  subjectId: 'subjectId',
  examName: 'examName',
  examDate: 'examDate',
  totalMarks: 'totalMarks',
  duration: 'duration',
  instructions: 'instructions',
  status: 'status',
  styleFontFamily: 'styleFontFamily',
  styleFontSize: 'styleFontSize',
  styleColor: 'styleColor',
  templateType: 'templateType',
  pdfUrl: 'pdfUrl',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExamSectionScalarFieldEnum = {
  id: 'id',
  examPaperId: 'examPaperId',
  label: 'label',
  type: 'type',
  marksEach: 'marksEach',
  order: 'order',
  segments: 'segments'
};

exports.Prisma.ExamQuestionScalarFieldEnum = {
  id: 'id',
  sectionId: 'sectionId',
  questionText: 'questionText',
  options: 'options',
  imageUrl: 'imageUrl',
  subject: 'subject',
  hint: 'hint',
  segmentType: 'segmentType',
  order: 'order'
};

exports.Prisma.ExamPaperTemplateScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  headerHtml: 'headerHtml',
  footerHtml: 'footerHtml',
  instructions: 'instructions',
  logoUrl: 'logoUrl',
  updatedAt: 'updatedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  isRead: 'isRead',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.ActivityLogScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  userId: 'userId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  metadata: 'metadata',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  actorId: 'actorId',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  oldValues: 'oldValues',
  newValues: 'newValues',
  ipAddress: 'ipAddress',
  createdAt: 'createdAt'
};

exports.Prisma.AcademicTermScalarFieldEnum = {
  id: 'id',
  schoolId: 'schoolId',
  academicSessionId: 'academicSessionId',
  name: 'name',
  startDate: 'startDate',
  endDate: 'endDate',
  totalWorkingDays: 'totalWorkingDays',
  actualAvailableDays: 'actualAvailableDays',
  weeklyHolidays: 'weeklyHolidays',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  terms: 'terms'
};

exports.Prisma.VacationDayScalarFieldEnum = {
  id: 'id',
  academicTermId: 'academicTermId',
  startDate: 'startDate',
  endDate: 'endDate',
  reason: 'reason',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};
exports.UserRole = exports.$Enums.UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  SCHOOL_ADMIN: 'SCHOOL_ADMIN',
  TEACHER: 'TEACHER'
};

exports.UserStatus = exports.$Enums.UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
};

exports.SchoolStatus = exports.$Enums.SchoolStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  INACTIVE: 'INACTIVE'
};

exports.SessionStatus = exports.$Enums.SessionStatus = {
  ACTIVE: 'ACTIVE',
  ARCHIVED: 'ARCHIVED'
};

exports.SubscriptionStatus = exports.$Enums.SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
  TRIAL: 'TRIAL'
};

exports.ChapterWorkflowStatus = exports.$Enums.ChapterWorkflowStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED'
};

exports.TopicStatus = exports.$Enums.TopicStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED'
};

exports.ExamPaperStatus = exports.$Enums.ExamPaperStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  REVIEWED: 'REVIEWED'
};

exports.QuestionType = exports.$Enums.QuestionType = {
  MCQ: 'MCQ',
  FILL_IN_THE_BLANK: 'FILL_IN_THE_BLANK',
  SHORT_ANSWER: 'SHORT_ANSWER',
  DESCRIPTIVE: 'DESCRIPTIVE',
  TRUE_FALSE: 'TRUE_FALSE',
  MATCHING: 'MATCHING',
  CUSTOM: 'CUSTOM'
};

exports.NotificationType = exports.$Enums.NotificationType = {
  INFO: 'INFO',
  SUCCESS: 'SUCCESS',
  WARNING: 'WARNING',
  ERROR: 'ERROR'
};

exports.AcademicTermStatus = exports.$Enums.AcademicTermStatus = {
  ACTIVE: 'ACTIVE',
  UPCOMING: 'UPCOMING',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED'
};

exports.Prisma.ModelName = {
  User: 'User',
  RefreshToken: 'RefreshToken',
  School: 'School',
  AcademicSession: 'AcademicSession',
  SubscriptionPlan: 'SubscriptionPlan',
  Subscription: 'Subscription',
  Teacher: 'Teacher',
  Class: 'Class',
  Subject: 'Subject',
  Chapter: 'Chapter',
  Topic: 'Topic',
  TeacherClass: 'TeacherClass',
  ChapterProgress: 'ChapterProgress',
  TopicProgress: 'TopicProgress',
  ExamPaper: 'ExamPaper',
  ExamSection: 'ExamSection',
  ExamQuestion: 'ExamQuestion',
  ExamPaperTemplate: 'ExamPaperTemplate',
  Notification: 'Notification',
  ActivityLog: 'ActivityLog',
  AuditLog: 'AuditLog',
  AcademicTerm: 'AcademicTerm',
  VacationDay: 'VacationDay'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
