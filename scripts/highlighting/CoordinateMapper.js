/**
 * Coordinate transformation utilities for highlighting system
 * Handles conversions between different coordinate spaces
 */
class CoordinateMapper {
    /**
     * Get relative point coordinates within a container from client coordinates
     */
    static getRelativePoint(container, clientX, clientY) {
        if (!container) {
            throw new Error('getRelativePoint requires a valid container element');
        }

        const rect = container.getBoundingClientRect();
        return { 
            x: clientX - rect.left, 
            y: clientY - rect.top 
        };
    }

    /**
     * Calculate canvas offset relative to viewer container
     */
    static getCanvasOffset(viewer, canvas) {
        if (!viewer || !canvas) {
            return { left: 0, top: 0 };
        }

        try {
            const vRect = viewer.getBoundingClientRect();
            const cRect = canvas.getBoundingClientRect();
            return {
                left: cRect.left - vRect.left,
                top: cRect.top - vRect.top
            };
        } catch (err) {
            return { left: 0, top: 0 };
        }
    }

    /**
     * Normalize rectangle coordinates to fit within canvas bounds
     */
    static normalizeToCanvas(rect, canvasRect, canvasOffset = { left: 0, top: 0 }) {
        if (!rect || !canvasRect) {
            throw new Error('normalizeToCanvas requires valid rect and canvasRect');
        }

        const localLeft = Math.max(0, Math.min(rect.left - canvasOffset.left, canvasRect.width));
        const localTop = Math.max(0, Math.min(rect.top - canvasOffset.top, canvasRect.height));
        const localWidth = Math.max(0, Math.min(rect.width, canvasRect.width));
        const localHeight = Math.max(0, Math.min(rect.height, canvasRect.height));

        return {
            left: localLeft,
            top: localTop,
            width: localWidth,
            height: localHeight
        };
    }

    /**
     * Convert absolute coordinates to percentage-based coordinates
     */
    static toPercentages(rect, containerRect) {
        if (!rect || !containerRect) {
            throw new Error('toPercentages requires valid rect and containerRect');
        }

        return {
            xPct: containerRect.width ? rect.left / containerRect.width : 0,
            yPct: containerRect.height ? rect.top / containerRect.height : 0,
            wPct: containerRect.width ? rect.width / containerRect.width : 0,
            hPct: containerRect.height ? rect.height / containerRect.height : 0
        };
    }

    /**
     * Convert percentage-based coordinates to absolute coordinates
     */
    static fromPercentages(percentages, containerRect, offset = { left: 0, top: 0 }) {
        if (!percentages || !containerRect) {
            throw new Error('fromPercentages requires valid percentages and containerRect');
        }

        return {
            left: offset.left + percentages.xPct * containerRect.width,
            top: offset.top + percentages.yPct * containerRect.height,
            width: percentages.wPct * containerRect.width,
            height: percentages.hPct * containerRect.height
        };
    }

    /**
     * Create a rectangle from two points
     */
    static rectFromPoints(startPoint, endPoint) {
        if (!startPoint || !endPoint) {
            throw new Error('rectFromPoints requires valid start and end points');
        }

        return {
            left: Math.min(startPoint.x, endPoint.x),
            top: Math.min(startPoint.y, endPoint.y),
            width: Math.abs(endPoint.x - startPoint.x),
            height: Math.abs(endPoint.y - startPoint.y)
        };
    }

    /**
     * Check if a rectangle has meaningful dimensions
     */
    static isSignificantSize(rect, minWidth = 2, minHeight = 2) {
        return !!(rect && rect.width > minWidth && rect.height > minHeight);
    }

    /**
     * Calculate zoom and pan values needed to focus on a highlight area
     * Returns scale and translation values for CSS transforms
     */
    static calculateFocusTransform(highlightRect, containerRect, padding = 20) {
        if (!highlightRect || !containerRect) {
            return { scale: 1, translateX: 0, translateY: 0 };
        }

        // Add padding around the highlight
        const targetWidth = containerRect.width - (padding * 2);
        const targetHeight = containerRect.height - (padding * 2);

        // Calculate scale to fit highlight within container
        const scaleX = targetWidth / highlightRect.width;
        const scaleY = targetHeight / highlightRect.height;
        const scale = Math.min(scaleX, scaleY, 4); // Max 4x zoom

        // Calculate translation to center the highlight
        const scaledWidth = highlightRect.width * scale;
        const scaledHeight = highlightRect.height * scale;
        
        const centerX = containerRect.width / 2;
        const centerY = containerRect.height / 2;
        
        const highlightCenterX = highlightRect.left + (highlightRect.width / 2);
        const highlightCenterY = highlightRect.top + (highlightRect.height / 2);
        
        const translateX = centerX - (highlightCenterX * scale);
        const translateY = centerY - (highlightCenterY * scale);

        return { scale, translateX, translateY };
    }

    /**
     * Calculate crop area coordinates for focus mode
     * Returns the rectangle that should be visible when cropping to a highlight
     */
    static calculateCropArea(highlightPercentages, padding = 0.1) {
        const { xPct, yPct, wPct, hPct } = highlightPercentages;
        
        // Add padding as percentage of total dimensions
        const paddedX = Math.max(0, xPct - padding);
        const paddedY = Math.max(0, yPct - padding);
        const paddedW = Math.min(1 - paddedX, wPct + (padding * 2));
        const paddedH = Math.min(1 - paddedY, hPct + (padding * 2));

        return {
            xPct: paddedX,
            yPct: paddedY,
            wPct: paddedW,
            hPct: paddedH
        };
    }

    /**
     * Safely get bounding client rect with error handling
     */
    static safeBoundingRect(element) {
        if (!element) return null;

        try {
            return element.getBoundingClientRect();
        } catch (err) {
            return null;
        }
    }
}

module.exports = CoordinateMapper;
