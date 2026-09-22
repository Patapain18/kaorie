#!/bin/sh
# Le montage de l'accueil Kaorie : sept plans Pexels, 5 s chacun, fondus de
# 0,8 s, et une boucle sans couture — la vidéo se termine par un fondu vers
# le début du premier plan, coupé pile à l'image par laquelle elle commence.
set -e
C=clips; F=0.8
seg() { # nom début durée → segment normalisé 1920×1080, 30 i/s, sans son
  ffmpeg -v error -y -ss "$2" -t "$3" -i "$C/$1.mp4" -an -vf "scale=1920:1080:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -preset fast -crf 14 "seg-$4.mp4"
}
seg toucan     9.8  4.2 0   # le début, moins la queue réservée à la boucle
seg aras       0.3  5   1
seg paresseux  6.0  5   2
seg capucin    3.0  5   3
seg papillon  24.5  5   4
seg grenouille 4.0  5   5
seg iguane    10.0  5   6
seg toucan     9.0  0.8 7   # la queue : les 0,8 s qui précèdent le début
# les décalages des fondus : la durée cumulée moins F, à chaque étape
ffmpeg -v error -y -i seg-0.mp4 -i seg-1.mp4 -i seg-2.mp4 -i seg-3.mp4 -i seg-4.mp4 -i seg-5.mp4 -i seg-6.mp4 -i seg-7.mp4 -filter_complex "
[0][1]xfade=transition=fade:duration=$F:offset=3.4[a];
[a][2]xfade=transition=fade:duration=$F:offset=7.6[b];
[b][3]xfade=transition=fade:duration=$F:offset=11.8[c];
[c][4]xfade=transition=fade:duration=$F:offset=16.0[d];
[d][5]xfade=transition=fade:duration=$F:offset=20.2[e];
[e][6]xfade=transition=fade:duration=$F:offset=24.4[f];
[f][7]xfade=transition=fade:duration=$F:offset=28.6[v]" -map "[v]" -an \
  -c:v libx264 -preset slow -crf 25 -profile:v high -level 4.1 -g 60 -pix_fmt yuv420p -movflags +faststart kaorie.mp4
ffmpeg -v error -y -i kaorie.mp4 -frames:v 1 -q:v 4 accueil.jpg
