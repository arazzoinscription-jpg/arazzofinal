import { redirect } from 'next/navigation';

// Landing PRÉSENTIELLE : hébergée par Arazzo OS. Redirection de marque.
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`https://os.formation-arazzo.store/presentiel/${slug}`);
}
