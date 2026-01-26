import { useEffect, useState } from 'react';

// Defina a interface para o TypeScript
interface Colaborador {
  name: string;
  email: string;
  role: 'employee'
}

export function useColaboradores() {
  const [data, setData] = useState<Colaborador[]>([]);

  useEffect(() => {
    // Substitua pela URL de produção do seu n8n
    const N8N_WEBHOOK_URL = 'https://seu-n8n.com/webhook/get-colaboradores';

    fetch(N8N_WEBHOOK_URL)
      .then(res => res.json())
      .then(items => setData(items))
      .catch(err => console.error("Erro ao buscar dados:", err));
  }, []);

  return data;
}