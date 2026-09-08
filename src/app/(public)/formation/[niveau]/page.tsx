import { redirect } from 'next/navigation';

// Landing formation EN LIGNE : hébergée par Arazzo OS. On y redirige depuis le
// site principal pour garder une URL de marque (formation-arazzo.store/formation/...).
export default async function Page({ params }: { params: Promise<{ niveau: string }> }) {
  const { niveau } = await params;
  redirect(`https://os.formation-arazzo.store/formation/${niveau}`);
}
