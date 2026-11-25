// Our own product model. Adapters map their source's shape into these types,
// so nothing above the adapters knows where products come from.

/** C2: our API owns category identifiers; the source's strings never leak out. */
export type Category = {
  slug: string;
  name: string;
};

export type Product = {
  /** A string, so a future source can use SKUs or UUIDs. */
  id: string;
  title: string;
  description: string;
  /** P1: the source has no currency; prices are shown as AUD. */
  price: number;
  /** P2: a URL the client loads directly. */
  imageUrl: string;
  category: Category;
  /** Optional: Fake Store's OpenAPI spec does not document it, so a source may omit it. */
  rating?: {
    /** Average score out of 5. */
    rate: number;
    count: number;
  };
};
