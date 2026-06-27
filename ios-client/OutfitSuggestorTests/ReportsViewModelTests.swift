import XCTest
@testable import OutfitSuggestor

final class ReportsViewModelTests: XCTestCase {

    // MARK: - Tabs

    func testReportTabEnumHasFourSections() {
        XCTAssertEqual(ReportTab.allCases.count, 4)
        XCTAssertEqual(ReportTab.allCases.map(\.rawValue), [
            "Overview",
            "Utilization",
            "Users",
            "Searches",
        ])
    }

    func testReportTabIdentifiableUsesRawValue() {
        XCTAssertEqual(ReportTab.overview.id, "Overview")
        XCTAssertEqual(ReportTab.searches.id, "Searches")
    }

    // MARK: - Timeline query params

    func testTimelineQueryItemsIncludesDatesCountryAndGroupBy() {
        let filters = ReportFilters(
            startDate: "2026-06-01",
            endDate: "2026-06-10",
            user: "",
            country: "UK",
            operationType: "",
            endpoint: ""
        )
        let items = ReportsQueryBuilder.timelineQueryItems(filters: filters, groupBy: "day")

        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "group_by", in: items), "day")
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "start_date", in: items), "2026-06-01")
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "end_date", in: items), "2026-06-10")
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "country", in: items), "UK")
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "city", in: items))
    }

    func testTimelineQueryItemsOmitsEmptyFilters() {
        let items = ReportsQueryBuilder.timelineQueryItems(filters: .empty)
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "group_by", in: items), "day")
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "start_date", in: items))
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "country", in: items))
    }

    // MARK: - Search reports query params

    func testSearchReportsQueryItemsIncludesDatesAndNumericUserId() {
        let filters = ReportFilters(
            startDate: "2026-06-01",
            endDate: "2026-06-10",
            user: "42",
            country: "UK",
            operationType: "ai_outfit_suggestion",
            endpoint: "/api/suggest"
        )
        let items = ReportsQueryBuilder.searchReportsQueryItems(filters: filters)

        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "start_date", in: items), "2026-06-01")
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "end_date", in: items), "2026-06-10")
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "user_id", in: items), "42")
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "country", in: items))
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "operation_type", in: items))
    }

    func testSearchReportsQueryItemsUsesUserParamForNameOrEmail() {
        let filters = ReportFilters(user: "admin@example.com")
        let items = ReportsQueryBuilder.searchReportsQueryItems(filters: filters)
        XCTAssertNil(ReportsQueryBuilder.queryValue(named: "user_id", in: items))
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "user", in: items), "admin@example.com")
    }

    func testTimelineQueryItemsIncludesUserFilter() {
        let filters = ReportFilters(user: "sajjad")
        let items = ReportsQueryBuilder.timelineQueryItems(filters: filters)
        XCTAssertEqual(ReportsQueryBuilder.queryValue(named: "user", in: items), "sajjad")
    }

    func testSearchReportsParamsMatchQueryBuilder() {
        let filters = ReportFilters(startDate: "2026-06-01", endDate: "2026-06-10", user: "7")
        let params = ReportsQueryBuilder.searchReportsParams(filters: filters)
        XCTAssertEqual(params.startDate, "2026-06-01")
        XCTAssertEqual(params.endDate, "2026-06-10")
        XCTAssertEqual(params.userId, 7)
        XCTAssertNil(params.user)
    }

    func testSearchReportsParamsUseUserForNameOrEmail() {
        let filters = ReportFilters(user: "sajjad")
        let params = ReportsQueryBuilder.searchReportsParams(filters: filters)
        XCTAssertNil(params.userId)
        XCTAssertEqual(params.user, "sajjad")
    }

    func testAccessLogsParamsIncludeSharedFiltersExceptCity() {
        let filters = ReportFilters(
            startDate: "2026-06-01",
            endDate: "2026-06-10",
            user: "tester",
            country: "US",
            operationType: "wardrobe_view",
            endpoint: "/api/wardrobe"
        )
        let params = ReportsQueryBuilder.accessLogsParams(filters: filters)
        XCTAssertEqual(params.startDate, "2026-06-01")
        XCTAssertEqual(params.endDate, "2026-06-10")
        XCTAssertEqual(params.user, "tester")
        XCTAssertEqual(params.country, "US")
        XCTAssertEqual(params.operationType, "wardrobe_view")
        XCTAssertEqual(params.endpoint, "/api/wardrobe")
    }

    // MARK: - Non-admin

    func testNonAdminMessageMatchesSpec() {
        XCTAssertEqual(ReportsCopy.nonAdminMessage, "Admin privileges are required to view reports.")
    }

    @MainActor
    func testSearchSetsNonAdminErrorWithoutCallingAPI() async {
        let viewModel = ReportsViewModel(isAdmin: false)
        await viewModel.search()
        XCTAssertEqual(viewModel.errorMessage, ReportsCopy.nonAdminMessage)
        XCTAssertFalse(viewModel.hasSearched)
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - Network error mapping

    func testNetworkErrorFormatterMapsNotConnectedToInternet() {
        let error = URLError(.notConnectedToInternet)
        XCTAssertEqual(
            ReportsErrorFormatter.message(for: error),
            ReportsCopy.networkUnreachableMessage
        )
    }

    func testNetworkErrorFormatterMapsCannotConnectToHost() {
        let error = URLError(.cannotConnectToHost)
        XCTAssertEqual(
            ReportsErrorFormatter.message(for: error),
            ReportsCopy.networkUnreachableMessage
        )
    }

    func testNetworkErrorFormatterMapsNetworkConnectionLost() {
        let error = URLError(.networkConnectionLost)
        XCTAssertEqual(
            ReportsErrorFormatter.message(for: error),
            ReportsCopy.networkUnreachableMessage
        )
    }

    func testNetworkErrorFormatterMapsFailedToFetchDescription() {
        struct FailedToFetchError: LocalizedError {
            var errorDescription: String? { "Failed to fetch" }
        }
        XCTAssertEqual(
            ReportsErrorFormatter.message(for: FailedToFetchError()),
            ReportsCopy.networkUnreachableMessage
        )
    }

    func testNetworkErrorFormatterMapsWrappedNetworkError() {
        let error = APIServiceError.networkError(URLError(.cannotConnectToHost))
        XCTAssertEqual(
            ReportsErrorFormatter.message(for: error),
            ReportsCopy.networkUnreachableMessage
        )
    }

    func testNetworkErrorFormatterKeepsServerErrorDetail() {
        let error = APIServiceError.serverError("Session expired")
        XCTAssertEqual(ReportsErrorFormatter.message(for: error), "Session expired")
    }

    func testNetworkErrorFormatterKeepsOtherErrorDescriptions() {
        let error = APIServiceError.invalidURL
        XCTAssertEqual(ReportsErrorFormatter.message(for: error), error.localizedDescription)
    }
}
