namespace PlayTimeApp;

public partial class MainPage
{
    int count;

    public MainPage()
    {
        InitializeComponent();
    }

    private void OnCounterClicked(object sender, EventArgs e)
    {
        count++;

        var message = $"Clicked {count}";
        CounterBtn.Text = count == 1 ? message + " time" : message + " times";

        SemanticScreenReader.Announce(CounterBtn.Text);
    }
}