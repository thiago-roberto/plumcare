export interface PageMetaDtoParameters {
  total: number;
  take: number;
  skip: number;
}

export class PageMetaDto {
  readonly total: number;
  readonly take: number;
  readonly skip: number;
  readonly hasMore: boolean;

  constructor({ total, take, skip }: PageMetaDtoParameters) {
    this.total = total;
    this.take = take;
    this.skip = skip;
    this.hasMore = skip + take < total;
  }
}
