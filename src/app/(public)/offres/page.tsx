import { redirect } from 'next/navigation';

// Hub de toutes les offres (en ligne + présentiel), hébergé par Arazzo OS.
export default function Page() {
  redirect('https://os.formation-arazzo.store/offres');
}
