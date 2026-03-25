import { useState, useRef, useCallback } from 'react';
import { View, PanResponder, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '@/theme/colors';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

const COLORS = ['#FFFFFF', '#FF8200', '#ef4444', '#10b981', '#3b82f6', '#a855f7', '#FBDB65'];
const WIDTHS = [3, 6];

interface Props {
  onSubmit: (drawing: string) => void;
  disabled?: boolean;
}

export function DrawingCanvas({ onSubmit, disabled }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedWidth, setSelectedWidth] = useState(WIDTHS[0]);
  const containerRef = useRef<View>(null);
  const layoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: (evt) => {
        const touch = evt.nativeEvent;
        const point = {
          x: touch.locationX / layoutRef.current.width,
          y: touch.locationY / layoutRef.current.height,
        };
        setCurrentStroke({ points: [point], color: selectedColor, width: selectedWidth });
      },
      onPanResponderMove: (evt) => {
        const touch = evt.nativeEvent;
        const point = {
          x: touch.locationX / layoutRef.current.width,
          y: touch.locationY / layoutRef.current.height,
        };
        setCurrentStroke(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
      },
      onPanResponderRelease: () => {
        if (currentStroke) {
          setStrokes(prev => [...prev, currentStroke]);
          setCurrentStroke(null);
        }
      },
    })
  ).current;

  const handleUndo = () => {
    setStrokes(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setStrokes([]);
  };

  const handleSubmit = () => {
    const drawing = JSON.stringify(strokes);
    onSubmit(drawing);
  };

  const onLayout = useCallback(() => {
    containerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      layoutRef.current = { x: pageX, y: pageY, width, height };
    });
  }, []);

  // Render strokes as SVG-like paths using View overlays
  const renderStroke = (stroke: Stroke, key: number) => {
    if (stroke.points.length < 2) return null;
    const w = layoutRef.current.width || 300;
    const h = layoutRef.current.height || 300;

    return stroke.points.slice(1).map((point, i) => {
      const prev = stroke.points[i];
      const x1 = prev.x * w;
      const y1 = prev.y * h;
      const x2 = point.x * w;
      const y2 = point.y * h;
      const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

      return (
        <View
          key={`${key}-${i}`}
          style={{
            position: 'absolute',
            left: x1,
            top: y1 - stroke.width / 2,
            width: Math.max(length, 1),
            height: stroke.width,
            backgroundColor: stroke.color,
            borderRadius: stroke.width / 2,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: 'left center',
          }}
        />
      );
    });
  };

  return (
    <View style={styles.container}>
      {/* Canvas */}
      <View
        ref={containerRef}
        style={styles.canvas}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        {strokes.map((s, i) => renderStroke(s, i))}
        {currentStroke && renderStroke(currentStroke, -1)}
      </View>

      {/* Color picker */}
      <View style={styles.toolbar}>
        <View style={styles.colorRow}>
          {COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, selectedColor === c && styles.colorDotSelected]}
              onPress={() => setSelectedColor(c)}
              activeOpacity={0.7}
            />
          ))}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.widthToggle, selectedWidth === WIDTHS[1] && styles.widthToggleThick]}
            onPress={() => setSelectedWidth(selectedWidth === WIDTHS[0] ? WIDTHS[1] : WIDTHS[0])}
            activeOpacity={0.7}
          >
            <Text style={styles.widthText}>{selectedWidth === WIDTHS[0] ? 'THIN' : 'THICK'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleUndo} activeOpacity={0.7}>
            <Text style={styles.toolButtonText}>UNDO</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolButton} onPress={handleClear} activeOpacity={0.7}>
            <Text style={styles.toolButtonText}>CLEAR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.submitButton, disabled && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={disabled || strokes.length === 0}
            activeOpacity={0.7}
          >
            <Text style={styles.submitText}>DONE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  canvas: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12,
    borderWidth: 2, borderColor: colors.surfaceBorder, overflow: 'hidden',
    position: 'relative',
  },
  toolbar: { paddingTop: 12, gap: 10 },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  colorDot: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'transparent',
    minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderColor: colors.accent, transform: [{ scale: 1.2 }] },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  widthToggle: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 44, justifyContent: 'center',
  },
  widthToggleThick: { borderColor: colors.accent },
  widthText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
  toolButton: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
    minHeight: 44, justifyContent: 'center',
  },
  toolButtonText: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, letterSpacing: 1 },
  submitButton: {
    paddingHorizontal: 20, paddingVertical: 8, borderRadius: 50,
    backgroundColor: colors.accent, minHeight: 44, justifyContent: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontSize: 11, fontWeight: '900', color: colors.accentText, letterSpacing: 1 },
});
