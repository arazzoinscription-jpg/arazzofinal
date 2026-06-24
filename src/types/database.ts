export type UserRole = "eleve" | "formateur" | "admin";
export type CourseLevel = "debutant" | "intermediaire" | "avance";
export type Currency = "DZD" | "EUR";

export interface User {
  id: string;
  nom: string;
  email: string;
  role: UserRole;
  ville?: string;
  pays?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Course {
  id: string;
  titre_fr: string;
  titre_ar?: string;
  titre_en?: string;
  slug: string;
  description_fr: string;
  description_ar?: string;
  description_en?: string;
  prix_dzd: number;
  prix_eur: number;
  niveau: CourseLevel;
  duree?: string;
  formateur_id: string;
  thumbnail?: string;
  published: boolean;
  visible_inscription?: boolean;
  created_at: string;
  formateur?: User;
  chapters?: Chapter[];
  reviews?: Review[];
  _count?: { enrollments: number };
}

export interface Chapter {
  id: string;
  course_id: string;
  titre: string;
  ordre: number;
  lessons?: Lesson[];
}

export interface Lesson {
  id: string;
  chapter_id: string;
  titre: string;
  video_url_bunny: string;
  duree_minutes?: number;
  ordre: number;
  is_preview?: boolean;
}

export interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  paid_at: string;
  amount: number;
  currency: Currency;
  course?: Course;
}

export interface Progress {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface Patron {
  id: string;
  titre: string;
  description?: string;
  prix_dzd: number;
  prix_eur: number;
  fichier_url: string;
  preview_url?: string;
  formateur_id: string;
  created_at: string;
  formateur?: User;
}

export interface PatronPurchase {
  id: string;
  user_id: string;
  patron_id: string;
  paid_at: string;
  patron?: Patron;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  uuid_public: string;
  user?: User;
  course?: Course;
}

export interface Review {
  id: string;
  user_id: string;
  course_id: string;
  note: number;
  commentaire?: string;
  created_at: string;
  user?: User;
}
