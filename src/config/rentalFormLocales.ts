/** Idioma del formulario público de renta (solo este formulario; el resto de la app no usa esto). */
export type RentalFormLang = 'en' | 'es';

export type RentalFormValidationMessages = {
  storePriceMissing: string;
  storeNameMissing: string;
  storePriceInvalid: string;
  /** Formulario público: obliga a elegir solo del catálogo. */
  storeMustSelectFromCatalog: string;
  storeProductNotInCatalog: string;
  storeQuantityInvalid: string;
  /** Placeholders: {name} producto, {max} stock disponible. */
  storeInsufficientStock: string;
};

export type RentalFormErrorMessages = {
  signRequired: string;
  termsRequired: string;
  rentalOptionRequired: string;
  paymentRequired: string;
  inventoryLoading: string;
  noBoardsInInventory: string;
  addAtLeastOneBoard: string;
  completeOrRemoveBoardRows: string;
  duplicateBoard: string;
  invalidBoard: string;
  submitFailed: string;
};

export type RentalFormStrings = {
  langSwitchToEs: string;
  langSwitchToEn: string;
  successTitle: string;
  successBody: string;
  successAnother: string;
  headerSubtitle: string;
  fullName: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  phone: string;
  address: string;
  addressPlaceholder: string;
  pickup: string;
  returnLabel: string;
  boardsSection: string;
  addBoard: string;
  loadingBoards: string;
  noBoardsWarning: string;
  boardRowLabel: (n: number) => string;
  boardsHelp: string;
  removeBoardAria: string;
  surfboardCombobox: {
    placeholder: string;
    ariaOpenList: string;
    ariaCloseList: string;
    noMatches: string;
  };
  boardCheckedBy: string;
  selectStaff: string;
  customerComments: string;
  customerCommentsHint: string;
  customerCommentsPlaceholder: string;
  rentalOptionsSection: string;
  rentalOptionLabels: Record<string, string>;
  storeItemsSection: string;
  addProduct: string;
  storeHelp: string;
  storeTableProduct: string;
  storeTableQuantity: string;
  /** Precio unitario en catálogo (solo referencia; el importe depende de la cantidad). */
  storeTablePrice: string;
  /** unitario × cantidad */
  storeTableLineTotal: string;
  storeCatalogSearchPlaceholder: string;
  storeCatalogNoMatch: string;
  storeCatalogEmpty: string;
  removeRowAria: string;
  noStoreItems: string;
  pricePerBoard: string;
  rentLine: (count: number, unit: string, subtotal: string) => string;
  storeTotal: string;
  contractTotal: string;
  paymentMethod: string;
  payCash: string;
  payCard: string;
  termsTitle: string;
  termsParagraphs: string[];
  signatureTitle: string;
  signatureHelp: string;
  agreeCheckbox: string;
  submit: string;
  submitting: string;
  validation: RentalFormValidationMessages;
  errors: RentalFormErrorMessages;
};

const rentalOptionLabelsEn: Record<string, string> = {
  surfboard_sesh: 'Surfboard Session (3hrs)',
  boogie_sesh: 'Boogie Session (3hrs)',
  regular_full_day: 'Regular Surfboard Full Day',
  premium_full_day: 'Premium Surfboard Full Day',
  bodyboard_extra: 'Surfboard Regular Extra Day',
  premium_extra_day: 'Premium Surfboard Extra Day',
  regular_week: 'Regular Surfboard Week',
  premium_week: 'Premium Surfboard Week',
};

const rentalOptionLabelsEs: Record<string, string> = {
  surfboard_sesh: 'Sesión de surf (3 h)',
  boogie_sesh: 'Sesión boogie (3 h)',
  regular_full_day: 'Tabla regular — día completo',
  premium_full_day: 'Tabla premium — día completo',
  bodyboard_extra: 'Tabla regular — día extra',
  premium_extra_day: 'Tabla premium — día extra',
  regular_week: 'Tabla regular — semana',
  premium_week: 'Tabla premium — semana',
};

export const RENTAL_FORM_STRINGS: Record<RentalFormLang, RentalFormStrings> = {
  en: {
    langSwitchToEs: 'Español',
    langSwitchToEn: 'English',
    successTitle: 'Successfully added',
    successBody: 'Your form was submitted correctly. Thank you.',
    successAnother: 'Submit another',
    headerSubtitle: 'Surfboard Rental Agreement',
    fullName: 'Full name *',
    namePlaceholder: 'Your name',
    email: 'Email *',
    emailPlaceholder: 'you@email.com',
    phone: 'Phone *',
    address: 'Address',
    addressPlaceholder: 'Your address',
    pickup: 'Pickup',
    returnLabel: 'Return',
    boardsSection: 'Surfboards *',
    addBoard: 'Add board',
    loadingBoards: 'Loading board inventory…',
    noBoardsWarning:
      'No boards in inventory. Staff must register boards in the admin panel before contracts can be submitted.',
    boardRowLabel: (n) => `Board ${n}`,
    boardsHelp:
      'One contract can include several boards (e.g. family or group). Each row must be a different board in Available status. Search by brand or number.',
    removeBoardAria: 'Remove board',
    surfboardCombobox: {
      placeholder: 'Search by brand or number…',
      ariaOpenList: 'Open list',
      ariaCloseList: 'Close list',
      noMatches: 'No matches in inventory.',
    },
    boardCheckedBy: 'Board checked by',
    selectStaff: 'Select…',
    customerComments: 'Comments or suggestions (optional)',
    customerCommentsHint: 'Share any note for the school team.',
    customerCommentsPlaceholder: 'e.g. preferred pickup time, equipment questions…',
    rentalOptionsSection: 'Rental options *',
    rentalOptionLabels: rentalOptionLabelsEn,
    storeItemsSection: 'Store items',
    addProduct: 'Add product',
    storeHelp:
      'Optional: shop items from the catalog only. Search and pick a product from the list — prices are set in the admin panel and cannot be changed here. Set the quantity per line; stock is checked against inventory when you submit.',
    storeTableProduct: 'Product',
    storeTableQuantity: 'Qty',
    storeTablePrice: 'Unit (catalog)',
    storeTableLineTotal: 'Line total',
    storeCatalogSearchPlaceholder: 'Search the catalog and pick a product…',
    storeCatalogNoMatch: 'No matches in the catalog. Choose a product registered in admin.',
    storeCatalogEmpty:
      'No products in the catalog yet. Staff must add store products in the admin before they appear here.',
    removeRowAria: 'Remove line',
    noStoreItems: 'No store items added.',
    pricePerBoard: 'Price per board:',
    rentLine: (count, unit, subtotal) =>
      `Rental (${count} ${count === 1 ? 'board' : 'boards'}): $${unit} × ${count} = $${subtotal}`,
    storeTotal: 'Store:',
    contractTotal: 'Contract total:',
    paymentMethod: 'Payment method *',
    payCash: 'Cash',
    payCard: 'Card',
    termsTitle: 'Terms and conditions',
    termsParagraphs: [
      'Payment must be made in full when signing this agreement.',
      '• There are no refunds for early returns.',
      '• All boards will be examined before departure and upon return.',
      'WAIVER AND ASSUMPTION OF RISK',
      'The undersigned voluntarily makes and grants this Waiver and Assumption of Risk in favor of Agua Tibia Surf School SA. I hereby waive and release from any and all claims for negligence or strict liability arising from my use or misuse of products provided while testing, including surfboards, surfboard fins and any other product offered by Agua Tibia Surf School SA.',
      'I understand, acknowledge and fully accept that surfing is a dangerous activity with inherent risk and hazards such as the possibility of injury to myself and others, damage to my boards, or the boards of others or even death, and that I nevertheless accept.',
    ],
    signatureTitle: 'Digital signature *',
    signatureHelp: 'Draw your signature in the box using your mouse or finger on touch devices.',
    agreeCheckbox:
      'I accept that I am a competent adult assuming the risk of my own free will, without being under any compulsion or coercion. I have checked my board for damage and confirm before signing. *',
    submit: 'Submit rental agreement',
    submitting: 'Submitting…',
    validation: {
      storePriceMissing: 'Enter a price for each store product or remove the empty row.',
      storeNameMissing: 'Enter a product name or clear the price on that row.',
      storePriceInvalid: 'Store prices must be valid numbers (e.g. 10 or 10.50).',
      storeMustSelectFromCatalog:
        'Each store line must be a product chosen from the list (prices cannot be entered manually).',
      storeProductNotInCatalog:
        'A selected product is no longer in the catalog. Refresh the page or pick another product.',
      storeQuantityInvalid: 'Enter a valid quantity (whole number, at least 1).',
      storeInsufficientStock:
        'Not enough stock for «{name}». Available: {max}. Reduce the quantity or remove the line.',
    },
    errors: {
      signRequired: 'Please sign the agreement before submitting',
      termsRequired: 'You must accept the terms and conditions',
      rentalOptionRequired: 'Select a rental option',
      paymentRequired: 'Select a payment method',
      inventoryLoading: 'Please wait for the board inventory to finish loading.',
      noBoardsInInventory: 'No boards available in inventory. Please contact the school.',
      addAtLeastOneBoard: 'Add at least one board from inventory.',
      completeOrRemoveBoardRows: 'Complete all board rows or remove empty rows.',
      duplicateBoard: 'You cannot assign the same board twice in one contract.',
      invalidBoard: 'One of the selected boards is not valid in inventory.',
      submitFailed: 'Failed to submit the form',
    },
  },
  es: {
    langSwitchToEs: 'Español',
    langSwitchToEn: 'English',
    successTitle: '¡Agregado correctamente!',
    successBody: 'El formulario se envió bien. Gracias.',
    successAnother: 'Enviar otro formulario',
    headerSubtitle: 'Acuerdo de alquiler de tabla',
    fullName: 'Nombre completo *',
    namePlaceholder: 'Tu nombre',
    email: 'Correo *',
    emailPlaceholder: 'tu@email.com',
    phone: 'Teléfono *',
    address: 'Dirección',
    addressPlaceholder: 'Tu dirección',
    pickup: 'Retiro',
    returnLabel: 'Devolución',
    boardsSection: 'Tablas de surf *',
    addBoard: 'Añadir tabla',
    loadingBoards: 'Cargando inventario de tablas…',
    noBoardsWarning:
      'No hay tablas en inventario. El personal debe registrar tablas en el panel administrativo antes de poder enviar contratos.',
    boardRowLabel: (n) => `Tabla ${n}`,
    boardsHelp:
      'Un mismo contrato puede incluir varias tablas (por ejemplo familia o grupo). Cada fila debe ser una tabla distinta en estado Disponible. Busca por marca o número.',
    removeBoardAria: 'Quitar tabla',
    surfboardCombobox: {
      placeholder: 'Busca por marca o número…',
      ariaOpenList: 'Abrir lista',
      ariaCloseList: 'Cerrar lista',
      noMatches: 'No hay coincidencias en el inventario.',
    },
    boardCheckedBy: 'Tabla revisada por',
    selectStaff: 'Seleccionar…',
    customerComments: 'Comentarios o sugerencias (opcional)',
    customerCommentsHint: 'Cualquier nota para el equipo de la escuela.',
    customerCommentsPlaceholder: 'Ej. horario preferido de retiro, dudas sobre el equipo…',
    rentalOptionsSection: 'Opciones de renta *',
    rentalOptionLabels: rentalOptionLabelsEs,
    storeItemsSection: 'Productos de tienda',
    addProduct: 'Añadir producto',
    storeHelp:
      'Opcional: artículos solo del catálogo de tienda. Busca y elige un producto de la lista — los precios se definen en el panel administrativo y no se pueden cambiar aquí. Indica la cantidad por línea; al enviar se valida contra el inventario.',
    storeTableProduct: 'Producto',
    storeTableQuantity: 'Cant.',
    storeTablePrice: 'P. unit.',
    storeTableLineTotal: 'Importe',
    storeCatalogSearchPlaceholder: 'Busca en el catálogo y elige un producto…',
    storeCatalogNoMatch: 'No hay coincidencias en el catálogo. Elige un producto dado de alta en administración.',
    storeCatalogEmpty:
      'Aún no hay productos en el catálogo. El personal debe darlos de alta en el panel administrativo para que aparezcan aquí.',
    removeRowAria: 'Quitar línea',
    noStoreItems: 'Sin productos de tienda.',
    pricePerBoard: 'Precio por tabla:',
    rentLine: (count, unit, subtotal) =>
      `Renta (${count} ${count === 1 ? 'tabla' : 'tablas'}): $${unit} × ${count} = $${subtotal}`,
    storeTotal: 'Tienda:',
    contractTotal: 'Total contrato:',
    paymentMethod: 'Método de pago *',
    payCash: 'Efectivo',
    payCard: 'Tarjeta',
    termsTitle: 'Términos y condiciones',
    termsParagraphs: [
      'El pago debe realizarse por completo al firmar este acuerdo.',
      '• No hay reembolsos por devoluciones anticipadas.',
      '• Todas las tablas serán examinadas antes de la salida y al regreso.',
      'RENUNCIA Y ASUNCIÓN DE RIESGO',
      'El firmante otorga voluntariamente esta renuncia y asunción de riesgo a favor de Agua Tibia Surf School SA. Por la presente renuncio y libero toda reclamación por negligencia o responsabilidad estricta derivada del uso o mal uso de los productos proporcionados, incluidas tablas de surf, quillas y cualquier otro producto ofrecido por Agua Tibia Surf School SA.',
      'Entiendo, reconozco y acepto plenamente que el surf es una actividad peligrosa con riesgos inherentes, como posibles lesiones a mí u otras personas, daños a tablas propias o ajenas o incluso la muerte, y no obstante lo acepto.',
    ],
    signatureTitle: 'Firma digital *',
    signatureHelp: 'Dibuja tu firma en el recuadro con el ratón o el dedo en pantallas táctiles.',
    agreeCheckbox:
      'Acepto que soy un adulto competente que asume el riesgo por voluntad propia, sin coacción. He revisado mi tabla en busca de daños y confirmo antes de firmar. *',
    submit: 'Enviar acuerdo de renta',
    submitting: 'Enviando…',
    validation: {
      storePriceMissing: 'Indica el precio de cada producto de tienda o elimina la fila vacía.',
      storeNameMissing: 'Indica el nombre del producto o borra el precio en esa fila.',
      storePriceInvalid: 'Revisa que los precios de tienda sean números válidos (ej. 10 o 10.50).',
      storeMustSelectFromCatalog:
        'Cada línea de tienda debe ser un producto elegido de la lista (no se puede escribir el precio a mano).',
      storeProductNotInCatalog:
        'Un producto elegido ya no está en el catálogo. Recarga la página o elige otro.',
      storeQuantityInvalid: 'Indica una cantidad válida (número entero ≥ 1).',
      storeInsufficientStock:
        'No hay suficiente stock de «{name}». Disponible: {max}. Reduce la cantidad o quita la línea.',
    },
    errors: {
      signRequired: 'Debes firmar el acuerdo antes de enviar',
      termsRequired: 'Debes aceptar los términos y condiciones',
      rentalOptionRequired: 'Selecciona una opción de renta',
      paymentRequired: 'Selecciona un método de pago',
      inventoryLoading: 'Espera a que cargue el inventario de tablas.',
      noBoardsInInventory: 'No hay tablas disponibles en inventario. Contacta a la escuela.',
      addAtLeastOneBoard: 'Añade al menos una tabla del inventario.',
      completeOrRemoveBoardRows: 'Completa todas las tablas o elimina las filas vacías.',
      duplicateBoard: 'No puedes asignar la misma tabla dos veces en un mismo contrato.',
      invalidBoard: 'Una de las tablas seleccionadas no es válida en el inventario.',
      submitFailed: 'Error al enviar el formulario',
    },
  },
};
