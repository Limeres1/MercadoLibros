import { Book, UserProfile, Review, Order, LibraryItem, Report } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'user_admin_1',
    email: 'joacolimeres@gmail.com',
    displayName: 'Joaquín Limeres (Admin)',
    role: 'admin',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    bio: 'Administrador general y moderador principal de Mercado Libros.',
    location: 'Buenos Aires, Argentina',
    phone: '+54 11 4455-8899',
    favoriteBookIds: ['book_1', 'book_2', 'book_3', 'book_7'],
    isBlocked: false,
    createdAt: '2025-01-10T10:00:00Z'
  },
  {
    id: 'user_seller_1',
    email: 'libreria.atenea@mercadolibros.com',
    displayName: 'Clara Méndez - Librería Atenea',
    role: 'seller',
    photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=250&q=80',
    bio: 'Librería independiente especializada en narrativa hispanoamericana, clásicos y primeras ediciones.',
    location: 'Córdoba, Argentina',
    phone: '+54 351 555-1234',
    favoriteBookIds: ['book_1', 'book_3', 'book_5', 'book_6'],
    isBlocked: false,
    createdAt: '2025-02-15T12:00:00Z'
  },
  {
    id: 'user_buyer_1',
    email: 'sofia.lectora@mercadolibros.com',
    displayName: 'Sofía Ramos',
    role: 'buyer',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    bio: 'Lectora voraz de novela latinoamericana, ciencia ficción y poesía contemporánea.',
    location: 'Montevideo, Uruguay',
    phone: '+598 99 123 456',
    favoriteBookIds: ['book_1', 'book_2', 'book_4', 'book_6'],
    isBlocked: false,
    createdAt: '2025-03-01T15:30:00Z'
  },
  {
    id: 'user_seller_2',
    email: 'libros.antiguos@mercadolibros.com',
    displayName: 'Marcos Varela - Rincones Literarios',
    role: 'seller',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
    bio: 'Comercio de ejemplares usados en excelente estado y rarezas bibliográficas.',
    location: 'Santiago, Chile',
    favoriteBookIds: ['book_2', 'book_7'],
    isBlocked: false,
    createdAt: '2025-02-20T09:00:00Z'
  }
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: 'book_1',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    isbn: '978-0307474728',
    description: 'La obra cumbre del realismo mágico narra la historia de la familia Buendía a lo largo de siete generaciones en el mítico pueblo de Macondo.',
    price: 18.50,
    condition: 'nuevo',
    genre: 'Realismo Mágico',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
    sampleText: `Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo. Macondo era entonces una aldea de veinte casas de barro y cañabrava construidas a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos. El mundo era tan reciente, que muchas cosas carecían de nombre, y para mencionarlas había que señalarlas con el dedo.

Todos los años, por el mes de marzo, una familia de gitanos desarrapados plantaba su carpa cerca de la aldea, y con un grande alboroto de pitos y timbales daban a conocer los nuevos inventos. Primero llevaron el imán. Un gitano corpulento, de barba montaraz y manos de gorrión, que se presentó con el nombre de Melquíades, hizo una truculenta demostración pública de lo que él mismo llamaba la octava maravilla de los sabios alquimistas de Macedonia. Fue de casa en casa arrastrando dos lingotes metálicos, y todo el mundo se espantó al ver que los calderos, las pailas, las tenazas y los anafes se caían de su sitio, y las maderas crujían por la desesperación de los clavos y los tornillos tratando de desenclavarse.`,
    fullContent: `Capítulo 1
Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo. Macondo era entonces una aldea de veinte casas de barro y cañabrava construidas a la orilla de un río de aguas diáfanas que se precipitaban por un lecho de piedras pulidas, blancas y enormes como huevos prehistóricos. El mundo era tan reciente, que muchas cosas carecían de nombre, y para mencionarlas había que señalarlas con el dedo.

Todos los años, por el mes de marzo, una familia de gitanos desarrapados plantaba su carpa cerca de la aldea, y con un grande alboroto de pitos y timbales daban a conocer los nuevos inventos. Primero llevaron el imán. Un gitano corpulento, de barba montaraz y manos de gorrión, que se presentó con el nombre de Melquíades, hizo una truculenta demostración pública de lo que él mismo llamaba la octava maravilla de los sabios alquimistas de Macedonia.

José Arcadio Buendía, cuya desaforada imaginación iba siempre más lejos que el ingenio de la naturaleza, y aun más allá del milagro y la magia, pensó que era posible servirse de aquella invención inútil para desenterrar el oro de la tierra. Melquíades, que era un hombre honrado, le previno: «Para eso no sirve». Pero José Arcadio Buendía no creía en aquel tiempo en la honradez de los gitanos, así que cambió su mulo y una partida de chivos por los dos lingotes imantados.

Capítulo 2
Durante varios meses, José Arcadio Buendía se obsesionó con las posibilidades de la ciencia. Pasaba noches enteras midiendo el azimut y el meridiano con un astrolabio y un cuadrante. Mientras tanto, Úrsula Iguarán, su hacendosa mujer, trataba de mantener en pie la economía doméstica vendiendo gallos de azúcar y pescaditos confitados.

Los niños crecían libres al sol del trópico. Aureliano, silencioso y retraído, parecía haber heredado la clarividencia de la madre y la paciencia del padre. Fue él quien primero distinguió el resplandor de los gitanos en su regreso triunfal, cargados esta vez con un telescopio gigantesco y una lupa del tamaño de un tambor.

Capítulo 3
La peste del insomnio llegó a Macondo una tarde cargada de zumbidos. Fue Visitación, la india guajira que servía en la casa, quien la reconoció de inmediato. «Lo más temible del insomnio», advirtió a Úrsula, «no es la imposibilidad de dormir, porque el cuerpo no siente cansancio alguno, sino su inexorable evolución hacia una manifestación más crítica: el olvido».

Pronto los habitantes de Macondo comenzaron a marcar todos los objetos con sus nombres respectivos: mesa, silla, reloj, puerta, pared, buey. En la entrada del camino principal clavaron un letrero definitivo: DIOS EXISTE.`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'published',
    rating: 4.9,
    reviewCount: 42,
    salesCount: 89,
    pages: 448,
    publicationYear: 1967,
    stock: 12,
    createdAt: '2025-01-15T08:00:00Z',
    updatedAt: '2025-02-01T10:00:00Z'
  },
  {
    id: 'book_2',
    title: 'Ficciones',
    author: 'Jorge Luis Borges',
    isbn: '978-0307950925',
    description: 'Una de las cumbres universales del cuento del siglo XX. Incluye laberintos, bibliotecas infinitas, espejos y enigmas metafísicos deslumbrantes.',
    price: 14.00,
    condition: 'digital',
    genre: 'Ficción',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    sampleText: `El universo (que otros llaman la Biblioteca) se compone de un número indefinido, y tal vez infinito, de galerías hexagonales, con vastos pozos de ventilación en el medio, cercados por barandas bajísimas. Desde cualquier hexágono se ven los pisos inferiores y superiores: interminablemente.

La distribución de las galerías es invariable. Veinte anaqueles, a cinco largos anaqueles por lado, cubren todos los lados menos dos; su altura, que es la de los pisos, excede apenas la de un bibliotecario normal. Una de las caras libres da a un angosto zaguán, que desemboca en otra galería, idéntica a la primera y a todas. A izquierda y a derecha del zaguán hay dos gabinetes minúsculos. Uno permite dormir de pie; otro, satisfacer las necesidades fecales. Por ahí pasa la escalera espiral, que se abisma y se eleva hacia lo remoto.`,
    fullContent: `La biblioteca de Babel
El universo (que otros llaman la Biblioteca) se compone de un número indefinido, y tal vez infinito, de galerías hexagonales, con vastos pozos de ventilación en el medio, cercados por barandas bajísimas. Desde cualquier hexágono se ven los pisos inferiores y superiores: interminablemente.

La distribución de las galerías es invariable. Veinte anaqueles, a cinco largos anaqueles por lado, cubren todos los lados menos dos; su altura, que es la de los pisos, excede apenas la de un bibliotecario normal. Como todos los hombres de la Biblioteca, he viajado en mi juventud; he peregrinado en busca de un libro, acaso del catálogo de catálogos; ahora que mis ojos casi no pueden descifrar lo que escribo, me preparo a morir a unas pocas leguas del hexágono en que nací.

El jardín de senderos que se bifurcan
En la página 242 de la Historia de la Guerra Europea, por Liddell Hart, se lee que una ofensiva de trece divisiones británicas (apoyadas por mil cuatrocientas piezas de artillería) contra la línea Montauban-Baphume debió postergarse hasta la tarde del 24 de julio de 1916. Las torrenciales lluvias (anota Hart) provocaron esa demora. La siguiente declaración, dictada, releída y firmada por el doctor Yu Tsun, antiguo catedrático de inglés en la Hochschule de Tsingtao, arroja sobre el caso una luz insospechada.

«...Y colgué el receptor. Inmediatamente después reconocí la voz que había contestado en alemán. Era la del capitán Richard Madden. Madden, en el departamento de Viktor Runeberg, significaba el fin de nuestros afanes y la muerte de Runeberg. Significaba que Madden me buscaba».`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'published',
    rating: 4.8,
    reviewCount: 31,
    salesCount: 124,
    pages: 224,
    publicationYear: 1944,
    stock: 999,
    createdAt: '2025-01-20T10:00:00Z',
    updatedAt: '2025-02-10T11:00:00Z'
  },
  {
    id: 'book_3',
    title: 'Rayuela',
    author: 'Julio Cortázar',
    isbn: '978-8420471891',
    description: 'La célebre contranovela que puede leerse de múltiples maneras. Horacio Oliveira y la Maga recorren el París bohemio y el Buenos Aires surreal.',
    price: 12.00,
    condition: 'usado',
    genre: 'Novela',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&w=600&q=80',
    sampleText: `¿Encontraría a la Maga? Tantas veces me había bastado asomarme, viniendo por la rue de Seine, al arco que da al Quai de Conti, y apenas la luz de ceniza y olivo que flota sobre el río me dejaba distinguir las formas, ya su silueta delgada se inscribía en el Pont des Arts, a veces andando de un lado a otro, a veces detenida en el pretil de hierro, inclinada sobre el agua.

Y era tan natural cruzar la calle, subir los peldaños del puente, entrar en su delgada cintura y acercarme a la Maga que sonreía sin sorpresa, convencida como yo de que un encuentro casual era lo menos casual en nuestras vidas, y que la gente que se da citas precisas es la misma que necesita papel rayado para escribirse o que aprieta desde abajo el tubo de dentífrico.`,
    fullContent: `Capítulo 1
¿Encontraría a la Maga? Tantas veces me había bastado asomarme, viniendo por la rue de Seine, al arco que da al Quai de Conti, y apenas la luz de ceniza y olivo que flota sobre el río me dejaba distinguir las formas, ya su silueta delgada se inscribía en el Pont des Arts.

La Maga no sabía que yo la buscaba, pero siempre nos encontrábamos. Andábamos sin buscarnos pero sabiendo que andábamos para encontrarnos. Ah, Maga, en cada mujer parecida a vos se agolpaba como un silencio ensordecedor esa pausa infinita que hacías al prender un cigarrillo Gauloises.

Capítulo 2
El Club de la Serpiente se reunía de noche en la buhardilla de Etienne o en el cuarto de Ronald. Discos viejos de Bessie Smith y Charlie Parker llenaban de humo azul las vigas del techo. Nadie tenía un centavo, pero compartíamos botellas baratas de tinto y discutíamos de pintura, de filosofía presocrática y de las cartas que nadie se animaba a enviar.`,
    sellerId: 'user_seller_2',
    sellerName: 'Marcos Varela - Rincones Literarios',
    status: 'published',
    rating: 4.7,
    reviewCount: 28,
    salesCount: 65,
    pages: 608,
    publicationYear: 1963,
    stock: 2,
    createdAt: '2025-01-22T14:00:00Z',
    updatedAt: '2025-02-05T12:00:00Z'
  },
  {
    id: 'book_4',
    title: '1984',
    author: 'George Orwell',
    isbn: '978-8499890944',
    description: 'La estremecedora distopía totalitaria que advirtió al mundo sobre la vigilancia masiva, el Gran Hermano y la manipulación del lenguaje.',
    price: 15.20,
    condition: 'nuevo',
    genre: 'Distopía',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&w=600&q=80',
    sampleText: `Era un día luminoso y frío de abril y los relojes daban las trece. Winston Smith, con la barbilla clavada en el pecho para eludir el viento desagradable, se deslizó rápidamente por las puertas de cristal de las Casas de la Victoria, aunque no con suficiente rapidez para evitar que una ráfaga de polvo arenoso entrara con él.

El vestíbulo olía a repollo cocido y a esteras viejas. Al fondo, un cartel en colores, demasiado grande para hallarse en un interior, estaba pegado a la pared. Representaba únicamente una cara enorme de más de un metro de anchura: la cara de un hombre de unos cuarenta y cinco años, con un espeso bigote negro y rasgos atractivos pero duros. Winston se dirigió hacia las escaleras. No valía la pena intentar subir en el ascensor.`,
    fullContent: `Parte 1 - Capítulo 1
Era un día luminoso y frío de abril y los relojes daban las trece. Winston Smith, con la barbilla clavada en el pecho para eludir el viento desagradable, se deslizó rápidamente por las puertas de cristal de las Casas de la Victoria.

En cada rellano, frente a la puerta del ascensor, el cartel de la enorme cara contemplaba a los recién llegados desde el muro. Era uno de esos dibujos realizados de tal manera que los ojos le siguen a uno a dondequiera que vaya. EL GRAN HERMANO TE VIGILA, decían las grandes letras al pie.

Dentro del apartamento una voz suave leía una serie de cifras que tenían que ver con la producción de arrabio. La voz provenía de una placa oblonga de metal, una especie de espejo oscurecido que formaba parte de la pared de la derecha. Winston giró un interruptor y la voz disminuyó de volumen, aunque las palabras continuaban distinguiéndose con claridad. Aquel artefacto (llamado telepantalla) no podía apagarse por completo.`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'published',
    rating: 4.9,
    reviewCount: 56,
    salesCount: 140,
    pages: 352,
    publicationYear: 1949,
    stock: 18,
    createdAt: '2025-01-25T16:00:00Z',
    updatedAt: '2025-02-12T17:00:00Z'
  },
  {
    id: 'book_5',
    title: 'El amor en los tiempos del cólera',
    author: 'Gabriel García Márquez',
    isbn: '978-0307389732',
    description: 'La historia inquebrantable de amor entre Florentino Ariza y Fermina Daza que sobrevive a más de medio siglo de esperas y transformaciones.',
    price: 16.90,
    condition: 'nuevo',
    genre: 'Romance',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=600&q=80',
    sampleText: `Era inevitable: el olor de las almendras amargas le recordaba siempre el destino de los amores contrariados. El doctor Juvenal Urbino lo percibió tan pronto como entró en la casa todavía en penumbras, adonde había acudido de urgencia a ocuparse de un caso que para él había dejado de ser urgente desde hacía muchos años.

El refugiado antillano Jeremiah de Saint-Amour, inválido de guerra, fotógrafo de niños y su adversario de ajedrez más compasivo, se había puesto a salvo de los tormentos de la memoria con un sahumerio de cianuro de oro.`,
    fullContent: `Capítulo 1
Era inevitable: el olor de las almendras amargas le recordaba siempre el destino de los amores contrariados. El doctor Juvenal Urbino lo percibió tan pronto como entró en la casa todavía en penumbras.

Encontró el cadáver cubierto con una manta en el catre de campaña. En una mesita de noche había una botella vacía y una carta sellada dirigida al propio doctor. Mientras el inspector de policía redactaba las actas de rigor, Juvenal Urbino contempló la serenidad del rostro del viejo amigo y comprendió que aquel adiós guardaba secretos profundos que tardarían décadas en desvelarse.`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'published',
    rating: 4.8,
    reviewCount: 38,
    salesCount: 77,
    pages: 496,
    publicationYear: 1985,
    stock: 7,
    createdAt: '2025-02-02T10:00:00Z',
    updatedAt: '2025-02-15T10:00:00Z'
  },
  {
    id: 'book_6',
    title: 'El principito',
    author: 'Antoine de Saint-Exupéry',
    isbn: '978-0156013864',
    description: 'Fábula poética ilustrada que aborda la amistad, el sentido de la vida, el amor y la condición humana a través de los ojos de un niño viajero.',
    price: 9.50,
    condition: 'digital',
    genre: 'Clásico',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
    sampleText: `Pido perdón a los niños por haber dedicado este libro a una persona grande. Tengo una seria razón para ello: esta persona grande es el mejor amigo que tengo en el mundo. Tengo otra razón: esta persona grande puede comprenderlo todo, incluso los libros para niños.

Cuando yo tenía seis años vi en un libro sobre la selva virgen que se titulaba "Historias vividas", una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera. He aquí la copia del dibujo.`,
    fullContent: `Capítulo 1
Cuando yo tenía seis años vi en un libro sobre la selva virgen que se titulaba "Historias vividas", una magnífica lámina. Representaba una serpiente boa que se tragaba a una fiera.

El libro decía: "Las serpientes boas tragan sus presas enteras, sin masticarlas. Luego no pueden moverse y duermen durante los seis meses que dura su digestión". Reflexioné mucho entonces sobre las aventuras de la selva y, a mi vez, logré trazar con un lápiz de color mi primer dibujo. Mi dibujo número 1 era así: una boa cerrada que digería un elefante. Se lo mostré a las personas grandes y les pregunté si mi dibujo les daba miedo. Me contestaron: "¿Por qué habría de asustar un sombrero?".

Capítulo 2
Viví así, solo, sin nadie con quien hablar verdaderamente, hasta que tuve una avería en el desierto de Sahara, hace seis años. Algo se había roto en mi motor. Y como no llevaba conmigo ni mecánico ni pasajeros, me dispuse a realizar, solo, una difícil reparación. Era para mí una cuestión de vida o muerte. Tenía agua de beber apenas para ocho días.

La primera noche me dormí sobre la arena, a mil millas de toda tierra habitada. Estaba más aislado que un náufrago en una balsa en medio del océano. Imaginaos, pues, mi sorpresa cuando, al romper el día, me despertó una extraña vocecita que decía:
—Por favor... ¡dibújame un cordero!
—¿Eh?
—Dibújame un cordero...`,
    sellerId: 'user_seller_2',
    sellerName: 'Marcos Varela - Rincones Literarios',
    status: 'published',
    rating: 5.0,
    reviewCount: 64,
    salesCount: 210,
    pages: 120,
    publicationYear: 1943,
    stock: 999,
    createdAt: '2025-01-18T11:00:00Z',
    updatedAt: '2025-02-14T15:00:00Z'
  },
  {
    id: 'book_7',
    title: 'Don Quijote de la Mancha',
    author: 'Miguel de Cervantes',
    isbn: '978-8420412146',
    description: 'La gran obra cumbre de la literatura castellana. Las andanzas cómicas e inmortales del ingenioso hidalgo y su fiel escudero Sancho Panza.',
    price: 19.90,
    condition: 'nuevo',
    genre: 'Clásico',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1463320726281-696a485928c7?auto=format&fit=crop&w=600&q=80',
    sampleText: `En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor. Una olla de algo más vaca que carnero, salpicón las más noches, duelos y quebrantos los sábados, lantejas los viernes, algún palomino de añadidura los domingos, consumían las tres partes de su hacienda.

El resto della concluían sayo de velarte, calzas de velludo para las fiestas, con sus pantuflos de lo mesmo, y los días de entresemana se honraba con su vellorí de lo más fino.`,
    fullContent: `Primera Parte - Capítulo 1
En un lugar de la Mancha, de cuyo nombre no quiero acordarme, no ha mucho tiempo que vivía un hidalgo de los de lanza en astillero, adarga antigua, rocín flaco y galgo corredor.

Es, pues, de saber que este sobredicho hidalgo, los ratos que estaba ocioso —que eran los más del año—, se daba a leer libros de caballerías con tanta afición y gusto, que olvidó casi de todo punto el ejercicio de la caza, y aun la administración de su hacienda; y llegó a tanto su curiosidad y desatino en esto, que vendió muchas hanegas de tierra de sembradura para comprar libros de caballerías en que leer.

En resolución, él se enfrascó tanto en su letura, que se le pasaban las noches leyendo de claro en claro, y los días de turbio en turbio; y así, del poco dormir y del mucho leer, se le secó el celebro de manera que vino a perder el juicio. Rematado ya su juicio, vino a dar en el más extraño pensamiento que jamás dio loco en el mundo: hacerse caballero andante.`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'published',
    rating: 4.7,
    reviewCount: 22,
    salesCount: 45,
    pages: 1100,
    publicationYear: 1605,
    stock: 5,
    createdAt: '2025-01-28T09:00:00Z',
    updatedAt: '2025-02-18T10:00:00Z'
  },
  {
    id: 'book_8',
    title: 'Crónica de una muerte anunciada',
    author: 'Gabriel García Márquez',
    isbn: '978-1400034956',
    description: 'Reconstrucción minuciosa de un asesinato que todo un pueblo conocía de antemano pero nadie fue capaz de impedir.',
    price: 11.50,
    condition: 'usado',
    genre: 'Novela',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    sampleText: `El día en que lo iban a matar, Santiago Nasar se levantó a las 5.30 de la mañana para esperar el buque en que llegaba el obispo. Había soñado que atravesaba un bosque de higuerones donde caía una llovizna tierna, y por un instante fue feliz en el sueño, pero al despertar se sintió por completo salpicado de cagada de pájaros.

«Siempre soñaba con árboles», me dijo Plácida Linero, su madre, evocando 27 años después los pormenores de aquel lunes ingrato. «La semana anterior había soñado que iba solo en un avión de papel de estaño que volaba sin tropezar por entre los almendros», me dijo.`,
    fullContent: `Capítulo 1
El día en que lo iban a matar, Santiago Nasar se levantó a las 5.30 de la mañana para esperar el buque en que llegaba el obispo. Había soñado que atravesaba un bosque de higuerones donde caía una llovizna tierna.

Plácida Linero, su madre, era una intérprete certera de los sueños ajenos, siempre que se los contaran en ayunas, pero no había advertido ningún augurio aciago en aquellos dos sueños de árboles con que su hijo le habló las mañanas que precedieron a su muerte.`,
    sellerId: 'user_seller_2',
    sellerName: 'Marcos Varela - Rincones Literarios',
    status: 'published',
    rating: 4.6,
    reviewCount: 19,
    salesCount: 52,
    pages: 144,
    publicationYear: 1981,
    stock: 3,
    createdAt: '2025-02-05T14:00:00Z',
    updatedAt: '2025-02-20T10:00:00Z'
  },
  // Book pending review for Admin moderation demo
  {
    id: 'book_pending_1',
    title: 'El Túnel (Edición anotada)',
    author: 'Ernesto Sabato',
    isbn: '978-8432248382',
    description: 'Confesión obsesiva y sombría de Juan Pablo Castel desde su celda, narrando los motivos que lo llevaron al asesinato de María Iribarne.',
    price: 13.00,
    condition: 'nuevo',
    genre: 'Novela',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
    sampleText: `Bastará decir que soy Juan Pablo Castel, el pintor que mató a María Iribarne; supongo que el proceso está en el recuerdo de todos y que no se necesitan mayores explicaciones sobre mi persona.`,
    fullContent: `Capítulo 1
Bastará decir que soy Juan Pablo Castel, el pintor que mató a María Iribarne; supongo que el proceso está en el recuerdo de todos y que no se necesitan mayores explicaciones sobre mi persona. Aunque ni el diablo sabe qué es lo que ha de recordar la gente, respecto de uno...`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'pending_review',
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 160,
    publicationYear: 1948,
    stock: 10,
    createdAt: '2025-03-01T12:00:00Z',
    updatedAt: '2025-03-01T12:00:00Z'
  },
  // Book draft for Seller demo
  {
    id: 'book_draft_1',
    title: 'Antología Poética Iberoamericana',
    author: 'Varios Autores',
    isbn: '978-9871122334',
    description: 'Compilado exclusivo de poesía contemporánea del siglo XXI.',
    price: 17.00,
    condition: 'digital',
    genre: 'Poesía',
    language: 'Español',
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80',
    sampleText: `Fragmento de muestra en preparación para el catálogo.`,
    fullContent: `Texto completo en borrador del vendedor.`,
    sellerId: 'user_seller_1',
    sellerName: 'Clara Méndez - Librería Atenea',
    status: 'draft',
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    pages: 200,
    publicationYear: 2024,
    stock: 50,
    createdAt: '2025-03-02T10:00:00Z',
    updatedAt: '2025-03-02T10:00:00Z'
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: 'rev_1',
    bookId: 'book_1',
    userId: 'user_buyer_1',
    userName: 'Sofía Ramos',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    rating: 5,
    comment: 'Una obra de arte inigualable. Cada relectura revela nuevos detalles de Macondo. La edición física llegó en perfecto estado.',
    createdAt: '2025-02-10T14:20:00Z'
  },
  {
    id: 'rev_2',
    bookId: 'book_1',
    userId: 'user_reviewer_2',
    userName: 'Martín Gómez',
    rating: 5,
    comment: 'Imprescindible en cualquier biblioteca. El ritmo narrativo de Gabo te atrapa desde la primera frase del coronel Aureliano.',
    createdAt: '2025-02-12T09:15:00Z'
  },
  {
    id: 'rev_3',
    bookId: 'book_2',
    userId: 'user_buyer_1',
    userName: 'Sofía Ramos',
    userPhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
    rating: 5,
    comment: 'La Biblioteca de Babel y Funes el memorioso son joyas de la metafísica universal. El lector digital de la plataforma funciona fluido.',
    createdAt: '2025-02-14T18:40:00Z'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-98421',
    buyerId: 'user_buyer_1',
    buyerName: 'Sofía Ramos',
    buyerEmail: 'sofia.lectora@mercadolibros.com',
    items: [
      {
        bookId: 'book_1',
        title: 'Cien años de soledad',
        author: 'Gabriel García Márquez',
        price: 18.50,
        coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
        condition: 'nuevo'
      },
      {
        bookId: 'book_2',
        title: 'Ficciones',
        author: 'Jorge Luis Borges',
        price: 14.00,
        coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
        condition: 'digital'
      }
    ],
    totalAmount: 32.50,
    paymentMethod: 'Tarjeta de Crédito (Visa •••• 4242)',
    shippingAddress: 'Av. 18 de Julio 1420, Montevideo',
    status: 'completed',
    createdAt: '2025-02-08T15:20:00Z'
  },
  {
    id: 'ORD-76190',
    buyerId: 'user_buyer_1',
    buyerName: 'Sofía Ramos',
    buyerEmail: 'sofia.lectora@mercadolibros.com',
    items: [
      {
        bookId: 'book_6',
        title: 'El principito',
        author: 'Antoine de Saint-Exupéry',
        price: 9.50,
        coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
        condition: 'digital'
      }
    ],
    totalAmount: 9.50,
    paymentMethod: 'Mercado Pago',
    status: 'completed',
    createdAt: '2025-02-22T11:10:00Z'
  }
];

export const INITIAL_LIBRARY: LibraryItem[] = [
  {
    id: 'lib_1',
    userId: 'user_buyer_1',
    bookId: 'book_1',
    title: 'Cien años de soledad',
    author: 'Gabriel García Márquez',
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80',
    purchasedAt: '2025-02-08T15:20:00Z',
    lastReadPage: 3,
    totalPages: 10,
    bookmarks: [
      {
        id: 'bm_1',
        page: 1,
        title: 'Comienzo de la historia de Melquíades',
        note: 'Notable descripción del imán y la alquimia.',
        createdAt: '2025-02-08T16:00:00Z'
      },
      {
        id: 'bm_2',
        page: 3,
        title: 'La peste del insomnio',
        note: 'Punto de inflexión en Macondo con el olvido.',
        createdAt: '2025-02-09T18:30:00Z'
      }
    ]
  },
  {
    id: 'lib_2',
    userId: 'user_buyer_1',
    bookId: 'book_2',
    title: 'Ficciones',
    author: 'Jorge Luis Borges',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    purchasedAt: '2025-02-08T15:20:00Z',
    lastReadPage: 1,
    totalPages: 6,
    bookmarks: []
  },
  {
    id: 'lib_3',
    userId: 'user_buyer_1',
    bookId: 'book_6',
    title: 'El principito',
    author: 'Antoine de Saint-Exupéry',
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80',
    purchasedAt: '2025-02-22T11:10:00Z',
    lastReadPage: 2,
    totalPages: 4,
    bookmarks: [
      {
        id: 'bm_3',
        page: 2,
        title: 'El desierto del Sahara',
        note: 'Encuentro con el principito pidiendo el cordero.',
        createdAt: '2025-02-22T11:45:00Z'
      }
    ]
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep_1',
    reporterId: 'user_buyer_1',
    reporterName: 'Sofía Ramos',
    targetType: 'book',
    targetId: 'book_8',
    targetTitle: 'Crónica de una muerte anunciada',
    reason: 'Precio engañoso o datos de edición dudosos',
    details: 'El vendedor no especificó claramente el estado de conservación de la tapa trasera en la versión usada.',
    status: 'pending',
    createdAt: '2025-02-25T14:30:00Z'
  },
  {
    id: 'rep_2',
    reporterId: 'user_buyer_2',
    reporterName: 'Carlos Benítez',
    targetType: 'review',
    targetId: 'rev_fake_99',
    targetTitle: 'Reseña con lenguaje ofensivo',
    reason: 'Lenguaje inapropiado o spam',
    details: 'Un usuario publicó insultos en vez de una crítica literaria constructiva.',
    status: 'pending',
    createdAt: '2025-02-26T17:15:00Z'
  }
];
