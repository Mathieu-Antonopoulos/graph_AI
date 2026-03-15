import warnings
import functools
import textwrap

from typing import List, Optional, Union


class Style:
    """
    Styled console string with ANSI colors and optional line breaking.
    Supports concatenation and simple formatting.
    """

    ERROR = "\033[91m"
    SECONDARY_ERROR = "\033[31m"
    WARNING = "\033[93m"
    SECONDARY_WARNING = "\033[33m"
    SUCCESS = "\033[92m"
    SECONDARY_SUCCESS = "\033[32m"
    INFO = "\033[94m"
    SECONDARY_INFO = "\033[96m"
    NONE = ""
    END = "\033[0m"

    _VALID_STYLES = {
        "ERROR", "SECONDARY_ERROR", "WARNING", "SECONDARY_WARNING",
        "SUCCESS", "SECONDARY_SUCCESS", "INFO", "SECONDARY_INFO", "NONE"
    }

    def __init__(self, style, message, auto_break=False, max_length=None):
        if isinstance(style, str):
            if style not in self._VALID_STYLES:
                raise ValueError(f"Invalid style: {style}. Must be one of: {sorted(self._VALID_STYLES)}")
            style = getattr(self, style)
        elif not isinstance(style, str):
            raise TypeError(f"`style` must be a string, got {type(style)}")

        self.style = style
        self.message = (
            "\n".join(textwrap.wrap(str(message), max_length))
            if auto_break and max_length
            else str(message)
        )

    def __str__(self):
        if self.style == "":
            return self.message
        return f"{self.style}{self.message}{self.END}"

    def __repr__(self):
        return self.__str__()

    def __add__(self, other):
        return str(self) + str(other)

    def __radd__(self, other):
        return str(other) + str(self)


class Table:
    """
    Represents a simple textual table for displaying tabular data.

    Attributes:
        rows (List[List[Union[str, int, float]]]): The rows of the table.
        headers (Optional[List[str]]): Optional column headers.
        align (str): Text alignment within cells ('left', 'center', or 'right').
    """

    def __init__(
        self,
        rows: Optional[List[List[Union[str, int, float]]]] = None,
        headers: Optional[List[str]] = None,
        align: str = "left"  # 'left', 'center', 'right'
    ):
        """
        Initializes a table with rows, optional headers, and alignment.

        Args:
            rows (Optional[List[List[Union[str, int, float]]]]): Table data as list of rows.
            headers (Optional[List[str]]): Column headers.
            align (str): Text alignment in cells ('left', 'center', or 'right').

        Raises:
            ValueError: If alignment is invalid.
        """
        self.rows = rows if rows is not None else []
        self.headers = headers
        self.align = align

        if self.align not in {"left", "center", "right"}:
            raise ValueError("align must be one of: 'left', 'center', 'right'")

    def add_row(self, row: List[Union[str, int, float]]):
        """
        Adds a new row to the table.

        Args:
            row (List[Union[str, int, float]]): Row to add.

        Raises:
            ValueError: If row length does not match headers or existing rows.
        """
        if self.headers and len(row) != len(self.headers):
            raise ValueError("Row length does not match number of headers")
        elif not self.headers and self.rows and len(row) != len(self.rows[0]):
            raise ValueError("Row length does not match existing rows")
        self.rows.append(row)

    def add_col(self, col: List[Union[str, int, float]], header: Optional[str] = None):
        """
        Adds a new column to the table.

        Args:
            col (List[Union[str, int, float]]): Column to add.
            header (Optional[str]): Optional header for the new column.

        Raises:
            ValueError: If column length does not match number of rows.
        """
        if self.rows and len(col) != len(self.rows):
            raise ValueError("Column length does not match number of rows")
        if self.headers and header is not None:
            self.headers.append(header)
        elif header is not None and self.headers is None:
            # create empty headers for existing columns
            self.headers = [None] * (len(self.rows[0]) if self.rows else 0)
            self.headers.append(header)

        if not self.rows and len(col) > 0:
            # create empty rows if table is empty
            self.rows = [[None] for _ in range(len(col))]

        for i, val in enumerate(col):
            if i >= len(self.rows):
                # add rows if needed
                self.rows.append([None] * (len(self.headers) if self.headers else 0))
            self.rows[i].append(val)

    def _get_column_widths(self) -> List[int]:
        """
        Computes the maximum width of each column based on content.

        Returns:
            List[int]: Widths of each column.
        """
        data = self.rows if not self.headers else [self.headers] + self.rows
        return [max(len(str(cell)) if cell is not None else 0 for cell in col) for col in zip(*data)]

    def _format_cell(self, cell: Union[str, int, float, None], width: int) -> str:
        """
        Formats a single cell according to alignment and width.

        Args:
            cell (Union[str, int, float, None]): Cell content.
            width (int): Width to fit.

        Returns:
            str: Formatted cell string.
        """
        s = str(cell) if cell is not None else ""
        if self.align == "right":
            return s.rjust(width)
        elif self.align == "center":
            return s.center(width)
        else:
            return s.ljust(width)

    def _format_row(self, row: List[Union[str, int, float, None]], col_widths: List[int]) -> str:
        """
        Formats a full table row.

        Args:
            row (List[Union[str, int, float, None]]): Row to format.
            col_widths (List[int]): Column widths.

        Returns:
            str: Formatted row string.
        """
        return " | ".join(self._format_cell(cell, width) for cell, width in zip(row, col_widths))

    def __str__(self) -> str:
        """
        Returns a string representation of the table.

        Returns:
            str: Formatted table as a string.
        """
        col_widths = self._get_column_widths()
        lines = []

        if self.headers:
            lines.append(self._format_row(self.headers, col_widths))
            lines.append("-+-".join("-" * w for w in col_widths))

        for row in self.rows:
            lines.append(self._format_row(row, col_widths))

        return "\n".join(lines)

    def __repr__(self) -> str:
        return self.__str__()

    def __add__(self, other):
        """
        Concatenates two tables by appending the rows of the second to the first.

        Args:
            other (Table): Another table to concatenate.

        Returns:
            Table: New combined table.

        Raises:
            ValueError: If headers differ.
        """
        if not isinstance(other, Table):
            return NotImplemented

        if self.headers != other.headers:
            raise ValueError("Cannot add tables with different headers")

        combined_rows = self.rows + other.rows
        return Table(combined_rows, headers=self.headers.copy() if self.headers else None, align=self.align)


class deprecated:
    """
    Decorator to mark functions/classes as deprecated.
    Issues a warning when called, and updates the docstring.

    Parameters
    ----------
    extra : str, default=''
        Message to append to the deprecation warning.
    """

    def __init__(self, extra=""):
        self.extra = extra

    def __call__(self, obj):
        if isinstance(obj, type):
            return self._decorate_class(obj)
        elif isinstance(obj, property):
            return self._decorate_property(obj)
        else:
            return self._decorate_fun(obj)

    def _decorate_class(self, cls):
        msg = f"Class {cls.__name__} is deprecated"
        if self.extra:
            msg += f"; {self.extra}"
        styled_msg = str(Style("WARNING", msg))

        original_init = cls.__init__

        def wrapped(*args, **kwargs):
            warnings.warn(styled_msg, category=FutureWarning, stacklevel=2)
            return original_init(*args, **kwargs)

        cls.__init__ = wrapped
        wrapped.__name__ = "__init__"
        wrapped.__doc__ = self._update_doc(original_init.__doc__)
        wrapped.deprecated_original = original_init

        return cls

    def _decorate_fun(self, fun):
        msg = f"Function {fun.__name__} is deprecated"
        if self.extra:
            msg += f"; {self.extra}"
        styled_msg = str(Style("WARNING", msg))

        @functools.wraps(fun)
        def wrapped(*args, **kwargs):
            warnings.warn(styled_msg, category=FutureWarning, stacklevel=2)
            return fun(*args, **kwargs)

        wrapped.__doc__ = self._update_doc(wrapped.__doc__)
        wrapped.__wrapped__ = fun
        return wrapped

    def _decorate_property(self, prop):
        styled_msg = str(Style("WARNING", self.extra))

        @property
        @functools.wraps(prop)
        def wrapped(*args, **kwargs):
            warnings.warn(styled_msg, category=FutureWarning)
            return prop.fget(*args, **kwargs)

        wrapped.__doc__ = self._update_doc(prop.__doc__)
        return wrapped

    def _update_doc(self, olddoc):
        newdoc = "DEPRECATED"
        if self.extra:
            newdoc = f"{newdoc}: {self.extra}"
        if olddoc:
            newdoc = f"{newdoc}\n\n    {olddoc}"
        return newdoc

    @staticmethod
    def is_deprecated(func):
        """Check if a function has been decorated with @deprecated."""
        closures = getattr(func, "__closure__", []) or []
        return "deprecated" in "".join(
            str(c.cell_contents)
            for c in closures
            if isinstance(c.cell_contents, str)
        )
