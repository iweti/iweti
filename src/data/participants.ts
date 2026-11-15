export interface Participant {
  name: string;
  contribution: string;
  photo?: string;
  description?: string;
}

// Adicione aqui as pessoas que participaram da IWETI.
// As fotos devem ficar em public/assets/images/ e usar o caminho /assets/images/arquivo.jpg.
export const participants: Participant[] = [];
