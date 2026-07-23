import React from 'react';
import { toJpeg } from 'html-to-image';

/**
 * Télécharge un graphique Recharts (SVG) en JPG
 */
export const downloadChartAsJpg = (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
  if (!ref.current) return;

  const svgElement = ref.current.querySelector('svg');
  if (!svgElement) {
    console.error("Élément SVG introuvable pour le graphique");
    return;
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgElement);
  const { width, height } = svgElement.getBoundingClientRect();

  const canvas = document.createElement('canvas');
  const scale = 2; 
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return;
  
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const img = new Image();
  const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 0.95);
    link.click();
  };

  img.src = url;
};

/**
 * Télécharge un tableau HTML en JPG
 */
export const downloadTableAsJpg = async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
  if (!ref.current) return;

  try {
    // On force un fond blanc et on retire temporairement les scrollbars pour la capture
    const dataUrl = await toJpeg(ref.current, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      style: {
        borderRadius: '0px',
      }
    });

    const link = document.createElement('a');
    link.download = `${filename}.jpg`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Erreur lors de la capture du tableau:', error);
    alert('Une erreur est survenue lors de la génération de l\'image du tableau.');
  }
};