import { UILogic, UIEventHandler } from 'ui-logic-core'

import * as utils from './search-results/util'
import { executeUITask } from 'src/util/ui-logic'
import { RootState as State, DashboardDependencies, Events } from './types'
import { haveTagsChanged } from 'src/util/have-tags-changed'

const updatePickerValues = (event: { added?: string; deleted?: string }) => (
    values: string[],
) => {
    if (event.added) {
        return [...new Set([...values, event.added])]
    }
    if (event.deleted) {
        return values.filter((tag) => tag !== event.deleted)
    }

    return values
}

type EventHandler<EventName extends keyof Events> = UIEventHandler<
    State,
    Events,
    EventName
>

export class DashboardLogic extends UILogic<State, Events> {
    constructor(private options: DashboardDependencies) {
        super()
    }

    getInitialState(): State {
        return {
            searchResults: {
                results: {},
                pageData: {
                    allIds: [],
                    byId: {},
                },
                noteData: {
                    allIds: [],
                    byId: {},
                },
                searchType: 'pages',
                searchState: 'pristine',
                paginationState: 'pristine',
                noteUpdateState: 'pristine',
                newNoteCreateState: 'pristine',
            },
            searchFilters: {
                searchQuery: '',
                isSearchBarFocused: false,
                domainsExcluded: [],
                domainsIncluded: [],
                isDateFilterActive: false,
                isDomainFilterActive: false,
                isTagFilterActive: false,
                searchFiltersOpen: false,
                tagsExcluded: [],
                tagsIncluded: [],
                dateFromInput: '',
                dateToInput: '',
            },
            listsSidebar: {
                newListCreateState: 'pristine',
                listDeleteState: 'pristine',
                isSidebarPeeking: false,
                isSidebarLocked: false,
                searchQuery: '',
                listData: {},
                followedLists: {
                    loadingState: 'pristine',
                    isExpanded: false,
                    listIds: [],
                },
                localLists: {
                    isAddInputShown: false,
                    addInputValue: '',
                    loadingState: 'pristine',
                    isExpanded: false,
                    listIds: [],
                },
            },
        }
    }

    /* START - Misc event handlers */
    searchPages: EventHandler<'searchPages'> = async ({
        previousState: { searchFilters },
    }) => {
        await executeUITask(
            this,
            (taskState) => ({
                searchResults: { searchState: { $set: taskState } },
            }),
            async () => {
                const result = await this.options.searchBG.searchPages({
                    contentTypes: {
                        pages: true,
                        highlights: false,
                        notes: false,
                    },
                    endDate: searchFilters.dateTo,
                    startDate: searchFilters.dateFrom,
                    query: searchFilters.searchQuery,
                    domainsInc: searchFilters.domainsIncluded,
                    domainsExc: searchFilters.domainsExcluded,
                    tagsInc: searchFilters.tagsIncluded,
                    tagsExc: searchFilters.tagsExcluded,
                })

                const {
                    noteData,
                    pageData,
                    results,
                } = utils.pageSearchResultToState(result)

                this.emitMutation({
                    searchResults: {
                        results: { $set: results },
                        pageData: { $set: pageData },
                        noteData: { $set: noteData },
                    },
                })
            },
        )
    }

    searchNotes: EventHandler<'searchNotes'> = async ({
        previousState: { searchFilters },
    }) => {
        await executeUITask(
            this,
            (taskState) => ({
                searchResults: { searchState: { $set: taskState } },
            }),
            async () => {
                const result = await this.options.searchBG.searchAnnotations({
                    endDate: searchFilters.dateTo,
                    startDate: searchFilters.dateFrom,
                    query: searchFilters.searchQuery,
                    domainsInc: searchFilters.domainsIncluded,
                    domainsExc: searchFilters.domainsExcluded,
                    tagsInc: searchFilters.tagsIncluded,
                    tagsExc: searchFilters.tagsExcluded,
                })

                const {
                    noteData,
                    pageData,
                    results,
                } = utils.annotationSearchResultToState(result)

                this.emitMutation({
                    searchResults: {
                        results: { $set: results },
                        pageData: { $set: pageData },
                        noteData: { $set: noteData },
                    },
                })
            },
        )
    }
    /* END - Misc event handlers */

    /* START - search result event handlers */
    setPageSearchResult: EventHandler<'setPageSearchResult'> = ({ event }) => {
        const state = utils.pageSearchResultToState(event.result)
        this.emitMutation({
            searchResults: {
                results: { $set: state.results },
                noteData: { $set: state.noteData },
                pageData: { $set: state.pageData },
            },
        })
    }

    setAnnotationSearchResult: EventHandler<'setAnnotationSearchResult'> = ({
        event,
    }) => {
        const state = utils.annotationSearchResultToState(event.result)
        this.emitMutation({
            searchResults: {
                results: { $set: state.results },
                noteData: { $set: state.noteData },
                pageData: { $set: state.pageData },
            },
        })
    }

    setPageBookmark: EventHandler<'setPageBookmark'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                pageData: {
                    byId: {
                        [event.id]: {
                            isBookmarked: { $set: event.isBookmarked },
                        },
                    },
                },
            },
        })
    }

    setPageTags: EventHandler<'setPageTags'> = async ({ event }) => {
        this.emitMutation({
            searchResults: {
                pageData: {
                    byId: {
                        [event.id]: {
                            tags: { $apply: updatePickerValues(event) },
                        },
                    },
                },
            },
        })

        await this.options.tagsBG.updateTagForPage({
            url: event.id,
            added: event.added,
            deleted: event.deleted,
        })
    }

    setPageLists: EventHandler<'setPageLists'> = async ({ event }) => {
        this.emitMutation({
            searchResults: {
                pageData: {
                    byId: {
                        [event.id]: {
                            lists: { $apply: updatePickerValues(event) },
                        },
                    },
                },
            },
        })

        await this.options.listsBG.updateListForPage({
            url: event.fullPageUrl,
            added: event.added,
            deleted: event.deleted,
            skipPageIndexing: event.skipPageIndexing,
        })
    }

    setPageDeleteModalShown: EventHandler<'setPageDeleteModalShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                pageData: {
                    byId: {
                        [event.id]: {
                            isDeleteModalShown: { $set: event.isShown },
                        },
                    },
                },
            },
        })
    }

    setPageCopyPasterShown: EventHandler<'setPageCopyPasterShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    isCopyPasterShown: { $set: event.isShown },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageListPickerShown: EventHandler<'setPageListPickerShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    isListPickerShown: { $set: event.isShown },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageTagPickerShown: EventHandler<'setPageTagPickerShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    isTagPickerShown: { $set: event.isShown },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNotesShown: EventHandler<'setPageNotesShown'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    areNotesShown: { $set: event.areShown },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNotesSort: EventHandler<'setPageNotesSort'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    sortingFn: { $set: event.sortingFn },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNotesType: EventHandler<'setPageNotesType'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    notesType: { $set: event.noteType },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNewNoteTagPickerShown: EventHandler<
        'setPageNewNoteTagPickerShown'
    > = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    newNoteForm: {
                                        isTagPickerShown: {
                                            $set: event.isShown,
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNewNoteTags: EventHandler<'setPageNewNoteTags'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    newNoteForm: { tags: { $set: event.tags } },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    setPageNewNoteCommentValue: EventHandler<'setPageNewNoteCommentValue'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    newNoteForm: {
                                        inputValue: { $set: event.value },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    cancelPageNewNote: EventHandler<'cancelPageNewNote'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                results: {
                    [event.day]: {
                        pages: {
                            byId: {
                                [event.pageId]: {
                                    newNoteForm: {
                                        $set: utils.getInitialFormState(),
                                    },
                                },
                            },
                        },
                    },
                },
            },
        })
    }

    savePageNewNote: EventHandler<'savePageNewNote'> = async ({
        event,
        previousState,
    }) => {
        const formState =
            previousState.searchResults.results[event.day].pages.byId[
                event.pageId
            ].newNoteForm

        await executeUITask(
            this,
            (taskState) => ({
                searchResults: { newNoteCreateState: { $set: taskState } },
            }),
            async () => {
                const newNoteId = await this.options.annotationsBG.createAnnotation(
                    {
                        pageUrl: event.fullPageUrl,
                        comment: formState.inputValue,
                    },
                    { skipPageIndexing: event.skipPageIndexing },
                )
                if (formState.tags.length) {
                    await this.options.annotationsBG.updateAnnotationTags({
                        url: newNoteId,
                        tags: formState.tags,
                    })
                }

                this.emitMutation({
                    searchResults: {
                        noteData: {
                            allIds: { $push: [newNoteId] },
                            byId: {
                                $apply: (byId) => ({
                                    ...byId,
                                    [newNoteId]: {
                                        url: newNoteId,
                                        displayTime: Date.now(),
                                        comment: formState.inputValue,
                                        tags: formState.tags,
                                        ...utils.getInitialNoteResultState(),
                                    },
                                }),
                            },
                        },
                        results: {
                            [event.day]: {
                                pages: {
                                    byId: {
                                        [event.pageId]: {
                                            newNoteForm: {
                                                $set: utils.getInitialFormState(),
                                            },
                                            noteIds: {
                                                user: { $push: [newNoteId] },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                })
            },
        )
    }

    setPageData: EventHandler<'setPageData'> = ({ event: { pages } }) => {
        const allIds = pages.map((page) => page.normalizedUrl)
        const byId = pages.reduce(
            (acc, curr) => ({ ...acc, [curr.normalizedUrl]: curr }),
            {},
        )

        this.emitMutation({
            searchResults: {
                pageData: { allIds: { $set: allIds }, byId: { $set: byId } },
            },
        })
    }

    setSearchType: EventHandler<'setSearchType'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                searchType: { $set: event.searchType },
            },
        })
    }

    setAllNotesShown: EventHandler<'setAllNotesShown'> = ({
        previousState,
    }) => {
        const applyChangeTooAll = (newState: boolean) => (results) => {
            for (const { day, pages } of Object.values(
                previousState.searchResults.results,
            )) {
                for (const pageId of Object.values(pages.allIds)) {
                    results[day].pages.byId[pageId].areNotesShown = newState
                }
            }
            return results
        }

        if (utils.areAllNotesShown(previousState.searchResults)) {
            this.emitMutation({
                searchResults: {
                    results: {
                        $apply: applyChangeTooAll(false),
                    },
                },
            })
        } else {
            this.emitMutation({
                searchResults: {
                    results: {
                        $apply: applyChangeTooAll(true),
                    },
                },
            })
        }
    }

    setNoteEditing: EventHandler<'setNoteEditing'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isEditing: { $set: event.isEditing },
                        },
                    },
                },
            },
        })
    }

    setNoteTagPickerShown: EventHandler<'setNoteTagPickerShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isTagPickerShown: { $set: event.isShown },
                        },
                    },
                },
            },
        })
    }

    setNoteCopyPasterShown: EventHandler<'setNoteCopyPasterShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isCopyPasterShown: { $set: event.isShown },
                        },
                    },
                },
            },
        })
    }

    setNoteDeleteModalShown: EventHandler<'setNoteDeleteModalShown'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isDeleteModalShown: { $set: event.isShown },
                        },
                    },
                },
            },
        })
    }

    setNoteRepliesShown: EventHandler<'setNoteRepliesShown'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            areRepliesShown: { $set: event.areShown },
                        },
                    },
                },
            },
        })
    }

    setNoteBookmark: EventHandler<'setNoteBookmark'> = ({ event }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isBookmarked: { $set: event.isBookmarked },
                        },
                    },
                },
            },
        })
    }

    setNoteTags: EventHandler<'setNoteTags'> = async ({ event }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            tags: { $apply: updatePickerValues(event) },
                        },
                    },
                },
            },
        })

        await this.options.annotationsBG.editAnnotationTags({
            url: event.noteId,
            tagsToBeAdded: [event.added],
            tagsToBeDeleted: [event.deleted],
        })
    }

    setNoteEditCommentValue: EventHandler<'setNoteEditCommentValue'> = ({
        event,
    }) => {
        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            editNoteForm: {
                                inputValue: { $set: event.value },
                            },
                        },
                    },
                },
            },
        })
    }

    cancelNoteEdit: EventHandler<'cancelNoteEdit'> = ({
        event,
        previousState,
    }) => {
        const { comment, tags } = previousState.searchResults.noteData.byId[
            event.noteId
        ]

        this.emitMutation({
            searchResults: {
                noteData: {
                    byId: {
                        [event.noteId]: {
                            isEditing: { $set: false },
                            editNoteForm: {
                                isTagPickerShown: { $set: false },
                                inputValue: { $set: comment ?? '' },
                                tags: { $set: tags ?? [] },
                            },
                        },
                    },
                },
            },
        })
    }

    saveNoteEdit: EventHandler<'saveNoteEdit'> = async ({
        event,
        previousState,
    }) => {
        const {
            editNoteForm,
            ...noteData
        } = previousState.searchResults.noteData.byId[event.noteId]
        const tagsHaveChanged = haveTagsChanged(
            noteData.tags,
            editNoteForm.tags,
        )

        await executeUITask(
            this,
            (taskState) => ({
                searchResults: { noteUpdateState: { $set: taskState } },
            }),
            async () => {
                await this.options.annotationsBG.editAnnotation(
                    event.noteId,
                    editNoteForm.inputValue,
                )
                if (tagsHaveChanged) {
                    await this.options.annotationsBG.updateAnnotationTags({
                        url: event.noteId,
                        tags: editNoteForm.tags,
                    })
                }

                this.emitMutation({
                    searchResults: {
                        noteData: {
                            byId: {
                                [event.noteId]: {
                                    isEditing: { $set: false },
                                    comment: { $set: editNoteForm.inputValue },
                                    tags: { $set: editNoteForm.tags },
                                },
                            },
                        },
                    },
                })
            },
        )
    }
    /* END - search result event handlers */

    /* START - search filter event handlers */
    setSearchQuery: EventHandler<'setSearchQuery'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { searchQuery: { $set: event.query } },
        })
    }

    setSearchBarFocus: EventHandler<'setSearchBarFocus'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { isSearchBarFocused: { $set: event.isFocused } },
        })
    }

    setSearchFiltersOpen: EventHandler<'setSearchFiltersOpen'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { searchFiltersOpen: { $set: event.isOpen } },
        })
    }

    setTagFilterActive: EventHandler<'setTagFilterActive'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { isTagFilterActive: { $set: event.isActive } },
        })
    }

    setDateFilterActive: EventHandler<'setDateFilterActive'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { isDateFilterActive: { $set: event.isActive } },
        })
    }

    setDomainFilterActive: EventHandler<'setDomainFilterActive'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { isDomainFilterActive: { $set: event.isActive } },
        })
    }

    setDateFromInputValue: EventHandler<'setDateFromInputValue'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { dateFromInput: { $set: event.value } },
        })
    }

    setDateToInputValue: EventHandler<'setDateToInputValue'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { dateToInput: { $set: event.value } },
        })
    }

    setDateFrom: EventHandler<'setDateFrom'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { dateFrom: { $set: event.value } },
        })
    }

    setDateTo: EventHandler<'setDateTo'> = async ({ event }) => {
        this.emitMutation({ searchFilters: { dateTo: { $set: event.value } } })
    }

    addIncludedTag: EventHandler<'addIncludedTag'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { tagsIncluded: { $push: [event.tag] } },
        })
    }

    delIncludedTag: EventHandler<'delIncludedTag'> = async ({
        event,
        previousState,
    }) => {
        const index = previousState.searchFilters.tagsIncluded.findIndex(
            (tag) => tag === event.tag,
        )

        if (index === -1) {
            return
        }

        this.emitMutation({
            searchFilters: { tagsIncluded: { $splice: [[index, 1]] } },
        })
    }

    addExcludedTag: EventHandler<'addExcludedTag'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { tagsExcluded: { $push: [event.tag] } },
        })
    }

    delExcludedTag: EventHandler<'delExcludedTag'> = async ({
        event,
        previousState,
    }) => {
        const index = previousState.searchFilters.tagsExcluded.findIndex(
            (tag) => tag === event.tag,
        )

        if (index === -1) {
            return
        }

        this.emitMutation({
            searchFilters: { tagsExcluded: { $splice: [[index, 1]] } },
        })
    }

    addIncludedDomain: EventHandler<'addIncludedDomain'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { domainsIncluded: { $push: [event.domain] } },
        })
    }

    delIncludedDomain: EventHandler<'delIncludedDomain'> = async ({
        event,
        previousState,
    }) => {
        const index = previousState.searchFilters.domainsIncluded.findIndex(
            (tag) => tag === event.domain,
        )

        if (index === -1) {
            return
        }

        this.emitMutation({
            searchFilters: { domainsIncluded: { $splice: [[index, 1]] } },
        })
    }

    addExcludedDomain: EventHandler<'addExcludedDomain'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { domainsExcluded: { $push: [event.domain] } },
        })
    }

    delExcludedDomain: EventHandler<'delExcludedDomain'> = async ({
        event,
        previousState,
    }) => {
        const index = previousState.searchFilters.domainsExcluded.findIndex(
            (tag) => tag === event.domain,
        )

        if (index === -1) {
            return
        }

        this.emitMutation({
            searchFilters: { domainsExcluded: { $splice: [[index, 1]] } },
        })
    }

    setTagsIncluded: EventHandler<'setTagsIncluded'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { tagsIncluded: { $set: event.tags } },
        })
    }

    setTagsExcluded: EventHandler<'setTagsExcluded'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { tagsExcluded: { $set: event.tags } },
        })
    }

    setDomainsIncluded: EventHandler<'setDomainsIncluded'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { domainsIncluded: { $set: event.domains } },
        })
    }

    setDomainsExcluded: EventHandler<'setDomainsExcluded'> = async ({
        event,
    }) => {
        this.emitMutation({
            searchFilters: { domainsExcluded: { $set: event.domains } },
        })
    }

    resetFilters: EventHandler<'resetFilters'> = async ({ event }) => {
        this.emitMutation({
            searchFilters: { $set: this.getInitialState().searchFilters },
        })
    }
    /* END - search filter event handlers */

    /* START - lists sidebar event handlers */
    setSidebarLocked: EventHandler<'setSidebarLocked'> = async ({ event }) => {
        this.emitMutation({
            listsSidebar: { isSidebarLocked: { $set: event.isLocked } },
        })
    }

    setSidebarPeeking: EventHandler<'setSidebarPeeking'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: { isSidebarPeeking: { $set: event.isPeeking } },
        })
    }

    setListQueryValue: EventHandler<'setListQueryValue'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: { searchQuery: { $set: event.query } },
        })
    }

    setAddListInputValue: EventHandler<'setAddListInputValue'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: {
                localLists: { addInputValue: { $set: event.value } },
            },
        })
    }

    setAddListInputShown: EventHandler<'setAddListInputShown'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: {
                localLists: { isAddInputShown: { $set: event.isShown } },
            },
        })
    }

    addNewList: EventHandler<'addNewList'> = async ({
        previousState: { listsSidebar },
    }) => {
        const newListName = listsSidebar.localLists.addInputValue.trim()

        await executeUITask(
            this,
            (taskState) => ({
                listsSidebar: { newListCreateState: { $set: taskState } },
            }),
            async () => {
                const listId = await this.options.listsBG.createCustomList({
                    name: newListName,
                })

                this.emitMutation({
                    listsSidebar: {
                        localLists: { listIds: { $push: [listId] } },
                        listData: {
                            [listId]: {
                                $set: { id: listId, name: newListName },
                            },
                        },
                    },
                })
            },
        )
    }

    setLocalListsExpanded: EventHandler<'setLocalListsExpanded'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: {
                localLists: { isExpanded: { $set: event.isExpanded } },
            },
        })
    }

    setFollowedListsExpanded: EventHandler<
        'setFollowedListsExpanded'
    > = async ({ event }) => {
        this.emitMutation({
            listsSidebar: {
                followedLists: { isExpanded: { $set: event.isExpanded } },
            },
        })
    }

    setSelectedListId: EventHandler<'setSelectedListId'> = async ({
        event,
        previousState,
    }) => {
        const listIdToSet =
            previousState.listsSidebar.selectedListId === event.listId
                ? undefined
                : event.listId

        this.emitMutation({
            listsSidebar: { selectedListId: { $set: listIdToSet } },
        })
    }

    setEditingListName: EventHandler<'setEditingListName'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: { editingListName: { $set: event.value } },
        })
    }

    setEditingListId: EventHandler<'setEditingListId'> = async ({
        event,
        previousState,
    }) => {
        const listIdToSet =
            previousState.listsSidebar.editingListId === event.listId
                ? undefined
                : event.listId

        const editingListName =
            previousState.listsSidebar.listData[listIdToSet]?.name

        this.emitMutation({
            listsSidebar: {
                editingListName: { $set: editingListName },
                editingListId: { $set: listIdToSet },
                showMoreMenuListId: { $set: undefined },
            },
        })
    }

    setShowMoreMenuListId: EventHandler<'setShowMoreMenuListId'> = async ({
        event,
        previousState,
    }) => {
        const listIdToSet =
            previousState.listsSidebar.showMoreMenuListId === event.listId
                ? undefined
                : event.listId

        this.emitMutation({
            listsSidebar: { showMoreMenuListId: { $set: listIdToSet } },
        })
    }

    setLocalLists: EventHandler<'setLocalLists'> = async ({ event }) => {
        const listIds: number[] = []
        const listDataById = {}

        for (const list of event.lists) {
            listIds.push(list.id)
            listDataById[list.id] = list
        }

        this.emitMutation({
            listsSidebar: {
                listData: { $merge: listDataById },
                localLists: { listIds: { $set: listIds } },
            },
        })
    }

    setFollowedLists: EventHandler<'setFollowedLists'> = async ({ event }) => {
        const listIds: number[] = []
        const listDataById = {}

        for (const list of event.lists) {
            listIds.push(list.id)
            listDataById[list.id] = list
        }

        this.emitMutation({
            listsSidebar: {
                listData: { $merge: listDataById },
                followedLists: { listIds: { $set: listIds } },
            },
        })
    }

    setDeletingListId: EventHandler<'setDeletingListId'> = async ({
        event,
    }) => {
        this.emitMutation({
            listsSidebar: {
                deletingListId: { $set: event.listId },
            },
        })
    }

    cancelListDelete: EventHandler<'cancelListDelete'> = async ({ event }) => {
        this.emitMutation({
            listsSidebar: {
                deletingListId: { $set: undefined },
            },
        })
    }

    confirmListDelete: EventHandler<'confirmListDelete'> = async ({
        event,
        previousState,
    }) => {
        const listId = previousState.listsSidebar.deletingListId
        // TODO: support for non-local lists
        const localListIds = previousState.listsSidebar.localLists.listIds.filter(
            (id) => id !== listId,
        )

        if (!listId) {
            throw new Error('No list ID is set for deletion')
        }

        await executeUITask(
            this,
            (taskState) => ({
                listsSidebar: { listDeleteState: { $set: taskState } },
            }),
            async () => {
                await this.options.listsBG.removeList({ id: listId })

                this.emitMutation({
                    listsSidebar: {
                        deletingListId: { $set: undefined },
                        localLists: { listIds: { $set: localListIds } },
                        listData: { $unset: [listId] },
                    },
                })
            },
        )
    }
    /* END - lists sidebar event handlers */

    example: EventHandler<'example'> = ({ event }) => {
        this.emitMutation({})
    }
}
