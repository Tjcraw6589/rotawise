import Foundation

// Mirrors src/lib/widgetSnapshot.ts. The app writes a JSON snapshot of the next 400 days
// into the shared App Group; this file reads it and decides what the widget shows.

let rotawiseAppGroup = "group.com.tyjcraw.rotawise"
let minutesPerDay = 1440

struct SnapshotDay: Codable {
    let d: String
    let on: Bool
    let c: String
    let s: Int
    let m: Int
    let l: String
}

struct WidgetSnapshot: Codable {
    let v: Int
    let generated: String
    let name: String
    let platoon: String
    let fill: String
    let text: String
    let bg: String
    let rotation: String
    let hour12: Bool
    let days: [SnapshotDay]
}

enum SnapshotStore {
    static func load() -> WidgetSnapshot? {
        guard let defaults = UserDefaults(suiteName: rotawiseAppGroup),
              let raw = defaults.string(forKey: "snapshot"),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetSnapshot.self, from: data)
    }
}

/// Civil date arithmetic on day numbers (days since 1970-01-01), identical to src/lib/rotation/dates.ts.
enum Civil {
    static var gregorian: Calendar {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone.current
        return cal
    }

    static func floorDiv(_ a: Int, _ b: Int) -> Int {
        let q = a / b
        return (a % b != 0 && ((a < 0) != (b < 0))) ? q - 1 : q
    }

    static func dayNumber(year: Int, month: Int, day: Int) -> Int {
        let y = month <= 2 ? year - 1 : year
        let era = floorDiv(y, 400)
        let yoe = y - era * 400
        let mp = (month + 9) % 12
        let doy = (153 * mp + 2) / 5 + day - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }

    static func dayNumber(_ iso: String) -> Int? {
        let parts = iso.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return dayNumber(year: parts[0], month: parts[1], day: parts[2])
    }

    static func civil(_ n: Int) -> (year: Int, month: Int, day: Int) {
        let z = n + 719468
        let era = floorDiv(z, 146097)
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let y = yoe + era * 400
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp < 10 ? mp + 3 : mp - 9
        return (m <= 2 ? y + 1 : y, m, d)
    }

    static func iso(_ n: Int) -> String {
        let c = civil(n)
        return String(format: "%04ld-%02ld-%02ld", c.year, c.month, c.day)
    }

    /// 0 = Sunday ... 6 = Saturday.
    static func weekday(_ n: Int) -> Int {
        return ((n + 4) % 7 + 7) % 7
    }

    /// Local day number and minutes after midnight for a moment.
    static func local(_ date: Date, calendar: Calendar) -> (day: Int, minutes: Int) {
        let c = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let day = dayNumber(year: c.year ?? 1970, month: c.month ?? 1, day: c.day ?? 1)
        return (day, (c.hour ?? 0) * 60 + (c.minute ?? 0))
    }

    /// The moment for a local day number plus minutes after its midnight (minutes may pass midnight).
    static func date(day: Int, minutes: Int, calendar: Calendar) -> Date? {
        let carry = floorDiv(minutes, minutesPerDay)
        let c = civil(day + carry)
        let rem = minutes - carry * minutesPerDay
        var comps = DateComponents()
        comps.year = c.year
        comps.month = c.month
        comps.day = c.day
        comps.hour = rem / 60
        comps.minute = rem % 60
        return calendar.date(from: comps)
    }
}

let weekdayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
let monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

func formatMinutes(_ minutes: Int, hour12: Bool) -> String {
    let m = ((minutes % minutesPerDay) + minutesPerDay) % minutesPerDay
    let h = m / 60
    let mm = m % 60
    if !hour12 {
        return String(format: "%02ld:%02ld", h, mm)
    }
    let suffix = h < 12 ? "AM" : "PM"
    let h12 = h % 12 == 0 ? 12 : h % 12
    return mm == 0 ? "\(h12) \(suffix)" : String(format: "%ld:%02ld", h12, mm) + " " + suffix
}

struct DayCell: Identifiable {
    let id: String
    let weekday: String
    let dayOfMonth: Int
    let on: Bool
    let code: String
    let isToday: Bool
}

struct WidgetViewModel {
    let ok: Bool
    let on: Bool
    let status: String
    let detail: String
    let dateLabel: String
    let platoon: String
    let fill: String
    let text: String
    let week: [DayCell]
}

/// What the widget shows at a moment. Mirrors widgetView() in src/lib/widgetSnapshot.ts.
func makeViewModel(_ snapshot: WidgetSnapshot?, at date: Date) -> WidgetViewModel {
    let now = Civil.local(date, calendar: Civil.gregorian)
    let today = now.day
    let parts = Civil.civil(today)
    let dateLabel = "\(weekdayShort[Civil.weekday(today)]), \(monthShort[parts.month - 1]) \(parts.day)"
    guard let snap = snapshot,
          let last = snap.days.last,
          let lastNum = Civil.dayNumber(last.d),
          lastNum >= today else {
        return WidgetViewModel(ok: false, on: false, status: "Open Rotawise", detail: "Open the app to refresh your rotation", dateLabel: dateLabel, platoon: "", fill: "#555555", text: "#FFFFFF", week: [])
    }
    let nowAbs = today * minutesPerDay + now.minutes
    var current: SnapshotDay? = nil
    var currentStart = 0
    var next: SnapshotDay? = nil
    for day in snap.days where day.on {
        guard let n = Civil.dayNumber(day.d) else { continue }
        let start = n * minutesPerDay + day.s
        let end = start + day.m
        if current == nil && start <= nowAbs && nowAbs < end {
            current = day
            currentStart = start
        }
        if next == nil && start > nowAbs {
            next = day
            break
        }
    }
    var detail = "No shifts scheduled"
    if let cur = current {
        let endAbs = currentStart + cur.m
        let endDay = Civil.floorDiv(endAbs, minutesPerDay)
        let endMin = endAbs - endDay * minutesPerDay
        let when = endDay == today ? "today" : (endDay == today + 1 ? "tomorrow" : Civil.iso(endDay))
        detail = "\(cur.l) until \(formatMinutes(endMin, hour12: snap.hour12)) \(when)"
    } else if let nx = next, let n = Civil.dayNumber(nx.d) {
        let days = n - today
        if days == 0 {
            detail = "Next shift today at \(formatMinutes(nx.s, hour12: snap.hour12))"
        } else if days == 1 {
            detail = "Next shift tomorrow"
        } else {
            detail = "Next shift in \(days) days"
        }
    }
    var week: [DayCell] = []
    let todayIso = Civil.iso(today)
    if let idx = snap.days.firstIndex(where: { $0.d == todayIso }) {
        for day in snap.days[idx..<min(idx + 7, snap.days.count)] {
            guard let n = Civil.dayNumber(day.d) else { continue }
            week.append(DayCell(id: day.d, weekday: weekdayShort[Civil.weekday(n)], dayOfMonth: Civil.civil(n).day, on: day.on, code: day.c, isToday: n == today))
        }
    }
    return WidgetViewModel(ok: true, on: current != nil, status: current != nil ? "ON" : "OFF", detail: detail, dateLabel: dateLabel, platoon: snap.platoon, fill: snap.fill, text: snap.text, week: week)
}

extension WidgetSnapshot {
    /// Shown in the widget gallery before the app has written real data.
    static func sample(now: Date = Date()) -> WidgetSnapshot {
        let today = Civil.local(now, calendar: Civil.gregorian).day
        var days: [SnapshotDay] = []
        for i in -2..<14 {
            let on = ((i % 3) + 3) % 3 == 0
            days.append(SnapshotDay(d: Civil.iso(today + i), on: on, c: on ? "24" : "", s: on ? 420 : 0, m: on ? 1440 : 0, l: on ? "24 hour tour" : "Off"))
        }
        return WidgetSnapshot(v: 1, generated: Civil.iso(today), name: "Me", platoon: "A", fill: "#C24E00", text: "#FFFFFF", bg: "system", rotation: "24/48", hour12: true, days: days)
    }
}
