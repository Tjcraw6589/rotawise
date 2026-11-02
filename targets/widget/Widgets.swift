import SwiftUI
import WidgetKit

struct RotawiseEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot?
}

struct RotawiseProvider: TimelineProvider {
    func placeholder(in context: Context) -> RotawiseEntry {
        RotawiseEntry(date: Date(), snapshot: WidgetSnapshot.sample())
    }

    func getSnapshot(in context: Context, completion: @escaping (RotawiseEntry) -> Void) {
        completion(RotawiseEntry(date: Date(), snapshot: SnapshotStore.load() ?? WidgetSnapshot.sample()))
    }

    /// Entries at every local midnight and every shift start and end for the next three
    /// days, so the widget flips ON and OFF at handover and rolls to the new date on its
    /// own. When the entries run out WidgetKit asks for a new timeline.
    func getTimeline(in context: Context, completion: @escaping (Timeline<RotawiseEntry>) -> Void) {
        let snap = SnapshotStore.load()
        let now = Date()
        let cal = Civil.gregorian
        let local = Civil.local(now, calendar: cal)
        var moments = Set<Date>([now])
        for offset in 1...3 {
            if let midnight = Civil.date(day: local.day + offset, minutes: 0, calendar: cal) {
                moments.insert(midnight)
            }
        }
        if let snap = snap {
            for day in snap.days where day.on {
                guard let n = Civil.dayNumber(day.d), n >= local.day - 2, n <= local.day + 3 else { continue }
                if let start = Civil.date(day: n, minutes: day.s, calendar: cal) { moments.insert(start) }
                if let end = Civil.date(day: n, minutes: day.s + day.m, calendar: cal) { moments.insert(end) }
            }
        }
        let horizon = now.addingTimeInterval(3 * 24 * 3600)
        let entries = moments
            .filter { $0 >= now && $0 <= horizon }
            .sorted()
            .map { RotawiseEntry(date: $0, snapshot: snap) }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

extension Color {
    init(hex: String) {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if s.hasPrefix("#") { s.removeFirst() }
        let v = UInt64(s, radix: 16) ?? 0
        if s.count == 8 {
            self.init(.sRGB, red: Double((v >> 24) & 0xFF) / 255, green: Double((v >> 16) & 0xFF) / 255, blue: Double((v >> 8) & 0xFF) / 255, opacity: Double(v & 0xFF) / 255)
        } else {
            self.init(.sRGB, red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255, opacity: 1)
        }
    }
}

/// Mirrors widgetColors() in src/lib/widgetSnapshot.ts.
struct WidgetPalette {
    let background: Color
    let foreground: Color
    let muted: Color
    let chipOff: Color
    let onColor: Color

    static func make(bg: String, systemDark: Bool, fill: String, text: String) -> WidgetPalette {
        if bg == "platoon" {
            let fg = Color(hex: text)
            return WidgetPalette(background: Color(hex: fill), foreground: fg, muted: fg.opacity(0.85), chipOff: fg.opacity(0.2), onColor: fg)
        }
        let dark = bg == "dark" || (bg == "system" && systemDark)
        if dark {
            return WidgetPalette(background: Color(hex: "#141C25"), foreground: Color(hex: "#F2F5F8"), muted: Color(hex: "#A9B5C1"), chipOff: Color(hex: "#1E2832"), onColor: Color(hex: "#5BD38A"))
        }
        return WidgetPalette(background: Color(hex: "#FFFFFF"), foreground: Color(hex: "#0E1621"), muted: Color(hex: "#4F5D6B"), chipOff: Color(hex: "#E9EDF1"), onColor: Color(hex: "#0F7A3F"))
    }
}

struct PlatoonChip: View {
    let letter: String
    let fill: String
    let text: String

    var body: some View {
        Text(letter)
            .font(.system(size: 14, weight: .heavy, design: .rounded))
            .foregroundStyle(Color(hex: text))
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background(RoundedRectangle(cornerRadius: 7).fill(Color(hex: fill)))
            .accessibilityLabel("Platoon \(letter)")
    }
}

struct TodayWidgetView: View {
    let entry: RotawiseEntry
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let vm = makeViewModel(entry.snapshot, at: entry.date)
        let p = WidgetPalette.make(bg: entry.snapshot?.bg ?? "system", systemDark: scheme == .dark, fill: vm.fill, text: vm.text)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center) {
                Text(vm.dateLabel)
                    .font(.caption)
                    .foregroundStyle(p.muted)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if !vm.platoon.isEmpty {
                    PlatoonChip(letter: vm.platoon, fill: vm.fill, text: vm.text)
                }
            }
            Spacer(minLength: 0)
            Text(vm.status)
                .font(.system(size: vm.ok ? 40 : 18, weight: .heavy, design: .rounded))
                .foregroundStyle(vm.on ? p.onColor : p.foreground)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(vm.detail)
                .font(.footnote)
                .foregroundStyle(p.foreground)
                .lineLimit(2)
                .minimumScaleFactor(0.8)
        }
        .containerBackground(for: .widget) { p.background }
        .widgetURL(URL(string: "rotawise://"))
    }
}

struct WeekWidgetView: View {
    let entry: RotawiseEntry
    @Environment(\.colorScheme) private var scheme

    private func cellLabel(_ d: DayCell, platoon: String) -> String {
        if d.on {
            return platoon + ((!d.code.isEmpty && d.code != "24") ? d.code : "")
        }
        return d.code.isEmpty ? "off" : d.code
    }

    var body: some View {
        let vm = makeViewModel(entry.snapshot, at: entry.date)
        let p = WidgetPalette.make(bg: entry.snapshot?.bg ?? "system", systemDark: scheme == .dark, fill: vm.fill, text: vm.text)
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .center) {
                Text(vm.ok ? "Today: \(vm.status)" : vm.status)
                    .font(.system(size: 17, weight: .bold, design: .rounded))
                    .foregroundStyle(vm.on ? p.onColor : p.foreground)
                    .lineLimit(1)
                Spacer(minLength: 4)
                if !vm.platoon.isEmpty {
                    PlatoonChip(letter: vm.platoon, fill: vm.fill, text: vm.text)
                }
            }
            Text(vm.detail)
                .font(.caption)
                .foregroundStyle(p.muted)
                .lineLimit(1)
            Spacer(minLength: 0)
            HStack(spacing: 4) {
                ForEach(vm.week) { d in
                    VStack(spacing: 2) {
                        Text(String(d.weekday.prefix(2)))
                            .font(.caption2.weight(d.isToday ? .bold : .regular))
                            .foregroundStyle(p.muted)
                        Text("\(d.dayOfMonth)")
                            .font(.footnote.weight(d.isToday ? .bold : .regular))
                            .foregroundStyle(p.foreground)
                        Text(cellLabel(d, platoon: vm.platoon))
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(d.on ? Color(hex: vm.text) : p.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                            .frame(maxWidth: .infinity, minHeight: 22)
                            .background(RoundedRectangle(cornerRadius: 6).fill(d.on ? Color(hex: vm.fill) : p.chipOff))
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .containerBackground(for: .widget) { p.background }
        .widgetURL(URL(string: "rotawise://"))
    }
}

struct RotawiseTodayWidget: Widget {
    let kind = "RotawiseToday"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RotawiseProvider()) { entry in
            TodayWidgetView(entry: entry)
        }
        .configurationDisplayName("Today")
        .description("Are you on or off today, and when your next shift is.")
        .supportedFamilies([.systemSmall])
    }
}

struct RotawiseWeekWidget: Widget {
    let kind = "RotawiseWeek"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RotawiseProvider()) { entry in
            WeekWidgetView(entry: entry)
        }
        .configurationDisplayName("Next 7 days")
        .description("Your next seven days at a glance.")
        .supportedFamilies([.systemMedium])
    }
}

@main
struct RotawiseWidgetBundle: WidgetBundle {
    var body: some Widget {
        RotawiseTodayWidget()
        RotawiseWeekWidget()
    }
}
