import XCTest
@testable import OutfitSuggestor

final class WeekPlanDayCardDisplayTests: XCTestCase {
    func testPlannedDayShowsOccasionAndStyle() {
        let line = WeekPlanDayCardDisplay.contextLine(
            enabled: true,
            occasion: "work",
            style: "classic"
        )
        XCTAssertEqual(line, "Work · Classic")
    }

    func testPlannedDayEmptyStyleDefaultsToClassic() {
        let line = WeekPlanDayCardDisplay.contextLine(
            enabled: true,
            occasion: "work",
            style: ""
        )
        XCTAssertEqual(line, "Work · Classic")
    }

    func testOffDayShowsOffOnly() {
        let line = WeekPlanDayCardDisplay.contextLine(
            enabled: false,
            occasion: "work",
            style: "classic"
        )
        XCTAssertEqual(line, "Off")
    }

    func testPlannedDayEmptyOccasionDefaultsToEveryday() {
        let line = WeekPlanDayCardDisplay.contextLine(
            enabled: true,
            occasion: "",
            style: "classic"
        )
        XCTAssertEqual(line, "Everyday · Classic")
    }
}
