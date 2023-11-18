/**
 * A predicate applied to an `Element`
 */
export type QueryFilterPredicate = (el: Element) => boolean;

export type QueryFilterPredicateAsync = (el: Element) => Promise<boolean>;

export type AnyFilter = QueryFilter | QueryFilterPredicate;

/**
 * Represent the operator to apply to a series of predicates, logical AND (intersection) or OR (union)
 */
export enum QueryFilterChainOperator {
    Intersection,
    Union
}

/**
 * Implemented by types who wants to apply some kind of filter to an `Element`
 */
export interface QueryFilter {
    apply(el: Element): boolean
}

/**
 * Basic implementor of `QueryFilter`. Do not instantiate this class directly, use the appropriate
 * functions provided: `and`, `or` and `not`
 */
export class QueryFilterImpl implements QueryFilter {
    constructor(
        private _chainOp: QueryFilterChainOperator = QueryFilterChainOperator.Intersection,
        private _negated: boolean = false,
        private _filters: AnyFilter[] = [],
        private _async: boolean = false
    ) {}

    public get chainOp(): QueryFilterChainOperator {
        return this._chainOp;
    }

    public get negated(): boolean {
        return this._negated;
    }

    public get async(): boolean {
        return this._async;
    }

    public get filters(): (QueryFilter | QueryFilterPredicate)[] {
        return this._filters;
    }

    apply(el: Element): boolean {
        let provisional;
        switch (this.chainOp) {
        default:
        case QueryFilterChainOperator.Intersection:
            provisional = this.filters.reduce((accumulator, fn) => {
                return accumulator && (QueryFilterImpl.isQueryFilterPredicate(fn) ? fn(el) : fn.apply(el));
            }, true);
            break;
        case QueryFilterChainOperator.Union:
            provisional = this.filters.reduce((accumulator, fn) => {
                return accumulator || (QueryFilterImpl.isQueryFilterPredicate(fn) ? fn(el) : fn.apply(el));
            }, false);
            break;
        }

        return this.negated ? !provisional : provisional;
    }

    static isQueryFilter(value: any): value is QueryFilter {
        return typeof value !== 'function';
    }
    
    static isQueryFilterPredicate(value: any): value is QueryFilterPredicate {
        return typeof value === 'function';
    }
}

export const filter = (predicate: QueryFilterPredicate): QueryFilter => {
    return new QueryFilterImpl(QueryFilterChainOperator.Intersection, false, [predicate]);
}

/**
 * Constructs a filter whose result is the intersection of the results of a set of `filters` (AND operatar)
 * @param filters - the filters to intersect
 * @returns - The built filter
 *
 * @example
 *  
 * Select all `div` and `a` that have `foo` AND `bar` as classes
 * 
 * ```typescript
 * select('div', 'a')
 *   .from(document)
 *   .where(
 *     and(
 *       (el) => el.classList.contains('foo'),
 *       (el) => el.classList.contains('bar')
 *     )
 *   )
 * ```
 */
export const and = (...filters: AnyFilter[]): QueryFilter => {
    return new QueryFilterImpl(QueryFilterChainOperator.Intersection, false, filters);
}

/**
 * Constructs a filter whose result is the union of the results of a set of `filters` (OR operatar)
 * @param filters - the filters to intersect
 * @returns - The built filter
 * 
 * @example
 * 
 * Select all `div` and `a` that have `foo` or `bar` as classes
 * 
 * ```typescript
 * select('div', 'a')
 *   .from(document)
 *   .where(
 *     or(
 *       (el) => el.classList.contains('foo'),
 *       (el) => el.classList.contains('bar')
 *     )
 *   )
 * ```
 */
export const or = (...filters: AnyFilter[]): QueryFilter => {
    return new QueryFilterImpl(QueryFilterChainOperator.Union, false, filters);
}

/**
 * Constructs a filter whose result is the negation of the result of another `filter` (NOT operatar)
 * @param filter - the filter to negate
 * @returns - The built filter
 * 
 * @example
 *  
 * Select all `div` and `a` that have `foo` but does NOT have `bar` as classes
 * 
 * ```typescript
 * select('div', 'a')
 *   .from(document)
 *   .where(
 *     and(
 *       (el) => el.classList.contains('foo'),
 *       not((el) => el.classList.contains('bar'))
 *     )
 *   )
 * ```
 */
export const not = (filter: AnyFilter): QueryFilter => {
    return new QueryFilterImpl(QueryFilterChainOperator.Intersection, true, [filter]);
}

/**
 * The identity filter. Basically a filter that always evaluates to `ŧrue`.
 */
export const identity: QueryFilter = filter(() => true);
