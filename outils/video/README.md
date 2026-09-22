# La vidéo de l'accueil

`video/kaorie.mp4` est un montage de sept plans de faune tropicale pris sur
Pexels — licence Pexels : usage libre, montage autorisé, pas de crédit
obligatoire. On les crédite quand même, c'est la moindre des choses :

| Plan | Vidéo Pexels |
|---|---|
| Toucan sur sa branche | https://www.pexels.com/video/29694938/ |
| Aras en vol | https://www.pexels.com/video/30049204/ |
| Paresseux, gros plan | https://www.pexels.com/video/36618204/ |
| Capucin dans la canopée | https://www.pexels.com/video/26077636/ |
| Papillon qui ouvre ses ailes | https://www.pexels.com/video/16001770/ |
| Rainette sur une feuille | https://www.pexels.com/video/30038996/ |
| Iguane | https://www.pexels.com/video/14097807/ |

`monter.sh` refait le montage avec ffmpeg à partir des fichiers d'origine
posés dans `clips/` (nommés toucan, aras, paresseux, capucin, papillon,
grenouille, iguane) : cinq secondes par plan, fondus de 0,8 s, 1080p à
30 i/s sans son, et une boucle sans couture — la fin fond vers le début du
premier plan, coupée pile à l'image de départ. `video/accueil.jpg` est la
première image, servie en `poster` le temps que la vidéo arrive.
