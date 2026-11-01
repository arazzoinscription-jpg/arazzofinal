import { z } from "zod";
import { analyserEmail } from "@/lib/email-verification";

/**
 * Une adresse e-mail VÉRIFIÉE : forme, adresse jetable, faute de frappe (« gamil.com » → message « Vouliez-vous dire
 * …@gmail.com ? »). Les adresses fausses rebondissaient et faisaient classer les e-mails de l'école en indésirables.
 */
export function zEmail() {
  return z.string().trim().toLowerCase().superRefine((v, ctx) => {
    const a = analyserEmail(v);
    if (!a.ok) ctx.addIssue({ code: "custom", message: a.message });
  });
}

/** Schémas Zod réutilisables pour valider les entrées (longueurs, formats, bornes). */

export const userInputSchema = z.object({
  name: z.string().trim().min(1, "Nom requis.").max(80, "Nom trop long (80 max)."),
  email: zEmail().pipe(z.string().max(160)),
  bio: z.string().trim().max(500, "Bio trop longue (500 max).").optional().nullable(),
});

export const courseSchema = z.object({
  title: z.string().trim().min(2, "Titre trop court.").max(160, "Titre trop long (160 max)."),
  description: z.string().trim().max(5000, "Description trop longue (5000 max).").optional().nullable(),
  price: z.coerce.number().int("Prix invalide.").min(0, "Prix négatif interdit.").max(10_000_000, "Prix hors limite."),
});

export const commentSchema = z.object({
  content: z.string().trim().min(1, "Message vide.").max(1000, "Message trop long (1000 max)."),
});

export const paymentProofSchema = z.object({
  fileType: z.enum(["image/jpeg", "image/png", "application/pdf"], { message: "Format non supporté (JPG, PNG ou PDF)." }),
  fileSize: z.number().int().positive("Fichier vide.").max(5 * 1024 * 1024, "Fichier trop lourd (max 5 Mo)."),
});

export type UserInput = z.infer<typeof userInputSchema>;
export type CourseInput = z.infer<typeof courseSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type PaymentProofInput = z.infer<typeof paymentProofSchema>;
