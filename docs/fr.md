# OC Transpo Ottawa

Les **prochains passages** des autobus et de l'**O-Train** d'OC Transpo près de
chez vous, dans Gladys.

Cette intégration n'est pas affiliée à OC Transpo ni à la Ville d'Ottawa.

## Démarrer en 3 étapes

Aucune connaissance technique n'est nécessaire, et aucun compte non plus pour
commencer.

1. **Vérifiez l'adresse de votre maison dans Gladys** : _Paramètres →
   Maisons_. La maison doit avoir une position sur la carte. L'intégration s'en
   sert pour trouver les arrêts proches de chez vous. La position reste dans
   votre Gladys.
2. **Installez l'intégration** depuis le catalogue des intégrations, et
   acceptez l'accès à la position de la maison. Ouvrez sa page de
   configuration et cliquez sur **Enregistrer**, sans rien remplir.
3. Ouvrez l'onglet **Découverte** de l'intégration. Les 3 arrêts les plus
   proches de chez vous y sont proposés, avec leur nom et la direction des
   lignes, par exemple « OC Transpo – Rideau / King Edward (6 → Greenboro) ».
   Cliquez sur **Ajouter** pour chacun de ceux qui vous intéressent.

C'est tout. Vous avez maintenant les **prochains passages** de chaque arrêt,
le plus souvent **en temps réel**.

Le message en haut de la page de configuration indique toujours la prochaine
chose à faire. Par exemple : « Prêt : 3 arrêts à ajouter. Ouvrez l'onglet
Découverte… ».

Les noms des appareils commencent par **OC Transpo –**. Vous pouvez les
renommer librement dans Gladys.

Une station de l'O-Train (Rideau, Lyon, Hurdman…) est un seul arrêt, pour tous
ses quais : trains et autobus.

### Afficher les passages sur le tableau de bord

1. Ouvrez le tableau de bord, puis cliquez sur **Modifier**.
2. Ajoutez un widget et choisissez **Passages OC Transpo**.
3. Choisissez l'arrêt, puis enregistrez.

Les passages suivis en temps réel sont en vert. Les horaires prévus sont en
gris et marqués d'un **~** : « ~12 min » signifie « prévu dans 12 minutes ».

## Le temps réel officiel (facultatif)

Sans clé, les passages viennent de Transitous, un service communautaire
gratuit qui reçoit déjà le temps réel d'OC Transpo pour la plupart des
autobus. Ils sont lus toutes les 2 minutes.

Avec une **clé d'API OC Transpo**, gratuite et personnelle, les passages
viennent directement du flux **temps réel d'OC Transpo**, lu chaque minute.

### Obtenir la clé d'API OC Transpo (5 minutes)

1. Allez sur la
   [page développeurs d'OC Transpo](https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/)
   et suivez le lien vers le **portail développeurs**. **Créez un compte**,
   puis activez-le avec le courriel que vous recevez.
2. Connectez-vous au portail, ouvrez **Produits** (_Products_) et
   **abonnez-vous** au produit **GTFS-RT**.
3. Ouvrez votre **profil** : l'abonnement affiche une **clé primaire**
   (_Primary key_). Copiez-la.
4. Dans Gladys, ouvrez la configuration de l'intégration. Collez la clé dans
   **Clé d'API OC Transpo**, puis cliquez sur **Enregistrer**.
5. Cliquez sur **Tester la clé d'API OC Transpo** : la ligne doit afficher ✔.

Les libellés du portail peuvent varier légèrement : le flux temps réel d'OC
Transpo est encore marqué « bêta ».

**Requêtes.** Une seule lecture du flux d'OC Transpo sert tous vos arrêts :
avec les réglages par défaut, l'intégration fait environ 1 400 requêtes par
jour, **quel que soit le nombre d'arrêts**.

## Surveiller d'autres arrêts (travail, école…)

Pour un arrêt loin de chez vous :

1. En bas de la page de configuration, cliquez sur **Chercher un arrêt**.
   Tapez un nom de rue, de station ou le numéro de l'arrêt, par exemple
   « Rideau » ou « Bank Somerset ».
2. La réponse liste les arrêts avec leur numéro et la direction de leurs
   lignes, par exemple `1658 — Rideau / King Edward (6 → Greenboro)`.
3. Copiez le numéro (`1658`) dans **Arrêts**, enregistrez, puis ajoutez
   l'arrêt dans l'onglet **Découverte**.

Le numéro est celui à 4 chiffres inscrit sur chaque panneau d'arrêt d'OC
Transpo (celui qu'on envoie au 560560).

### Pour aller plus loin

Le champ **Arrêts** accepte plusieurs numéros séparés par des virgules, un
filtre de lignes après `@` et un nom après `:`.

| Saisie                  | Signification                                   |
| ----------------------- | ----------------------------------------------- |
| `1658`                  | toutes les lignes qui passent à l'arrêt 1658    |
| `3009@1`                | seulement la Ligne 1 de l'O-Train, à Rideau     |
| `3009@6\|7`             | les lignes 6 et 7                               |
| `3009@7:Bus du travail` | ligne 7, affiché sous le nom « Bus du travail » |

## Ce que contient chaque appareil

- **Prochain passage**, **Passage 2**… : les minutes d'attente. 999 signifie
  qu'aucun passage n'est prévu.
- **Ligne du prochain passage**… : le numéro de ligne (« 7 », « 1 » pour la
  Ligne 1 de l'O-Train).
- **Prochains passages** : un résumé, par exemple `7 3 min · 6 ~11 min`.

## Scènes

**Déclencheur :** **Passage imminent** : un passage a lieu dans moins de 1, 2,
3, 5, 10 ou 15 minutes. Exemple : « quand le 7 est à 5 minutes, allumer la
lampe de l'entrée ».

**Action :** **Lire les prochains passages** : par exemple, un message chaque
matin « Ton 7 passe dans {{minutes}} minutes ».

## Dépannage

| Message ou symptôme                                    | Que faire                                                                                                             |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| « indiquez l'adresse de votre maison »                 | _Paramètres → Maisons_ : placez la maison sur la carte, puis enregistrez à nouveau la configuration de l'intégration. |
| « Gladys n'a pas partagé la position de votre maison » | Réinstallez l'intégration et acceptez l'accès à la position, ou tapez des numéros d'arrêt.                            |
| Rien dans l'onglet Découverte                          | Lisez le message de la page de configuration : il dit ce qui manque.                                                  |
| « OC Transpo a refusé la clé d'API »                   | Vérifiez que vous avez collé la clé primaire de l'abonnement GTFS-RT, et que l'abonnement est actif.                  |
| « L'arrêt … n'est pas dans la liste des arrêts »       | Vérifiez le numéro sur le panneau. Un arrêt tout nouveau arrive avec la prochaine version de l'intégration.           |
| Un arrêt reste à 999                                   | Aucun passage prévu (la nuit), ou un filtre de ligne qui ne correspond à aucune ligne de l'arrêt.                     |

## Vie privée, données et licences

- La position de la maison ne sert qu'à chercher les arrêts proches, dans la
  liste des arrêts livrée avec l'intégration : elle n'est envoyée nulle part.
- Liste des arrêts : GTFS d'OC Transpo, livré avec l'intégration (mis à jour à
  chaque version).
- Passages sans clé : [Transitous](https://transitous.org/sources/), un
  service communautaire gratuit, à partir des données d'OC Transpo.
- Temps réel : données ouvertes d'OC Transpo et de la Ville d'Ottawa, selon
  les
  [conditions d'utilisation](https://www.octranspo.com/en/plan-your-trip/travel-tools/developers/dev-terms/).
- Code de l'intégration : licence Apache 2.0.
