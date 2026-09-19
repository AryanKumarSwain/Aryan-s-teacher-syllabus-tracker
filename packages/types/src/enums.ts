export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  TRIAL = 'TRIAL',
}

export enum ChapterWorkflowStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum SchoolStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INACTIVE = 'INACTIVE',
}

export enum CpdDomain {
  CORE_VALUES_ETHICS = 'CORE_VALUES_ETHICS',
  KNOWLEDGE_PRACTICE = 'KNOWLEDGE_PRACTICE',
  PROFESSIONAL_GROWTH = 'PROFESSIONAL_GROWTH',
}

export enum CpdProvider {
  CBSE = 'CBSE',
  SCHOOL = 'SCHOOL',
  SAHODAYA = 'SAHODAYA',
  OTHER = 'OTHER',
}

export enum CpdTrainingMode {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  BLENDED = 'BLENDED',
}

export enum CpdRecordStatus {
  VERIFIED = 'VERIFIED',
  SUBMITTED = 'SUBMITTED',
  REJECTED = 'REJECTED',
}
