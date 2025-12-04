
declare namespace chrome {
  namespace history {
    interface HistoryItem {
      id: string;
      url?: string;
      title?: string;
      lastVisitTime?: number;
      visitCount?: number;
      typedCount?: number;
    }

    interface SearchQuery {
      text: string;
      startTime?: number;
      endTime?: number;
      maxResults?: number;
    }

    function search(query: SearchQuery): Promise<HistoryItem[]>;
    function addUrl(details: { url: string }): Promise<void>;
  }

  namespace bookmarks {
    interface BookmarkTreeNode {
      id: string;
      parentId?: string;
      index?: number;
      url?: string;
      title: string;
      dateAdded?: number;
      dateGroupModified?: number;
      children?: BookmarkTreeNode[];
    }

    function getTree(): Promise<BookmarkTreeNode[]>;
  }

  namespace tabs {
    interface Tab {
      id?: number;
      index: number;
      windowId: number;
      highlighted: boolean;
      active: boolean;
      pinned: boolean;
      url?: string;
      title?: string;
      favIconUrl?: string;
    }

    function create(createProperties: { url: string }): Promise<Tab>;
  }
}
